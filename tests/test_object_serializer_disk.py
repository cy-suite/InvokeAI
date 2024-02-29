from dataclasses import dataclass
from logging import Logger
from pathlib import Path
from unittest.mock import Mock

import pytest
import torch

from invokeai.app.services.invoker import Invoker
from invokeai.app.services.object_serializer.object_serializer_common import ObjectNotFoundError
from invokeai.app.services.object_serializer.object_serializer_disk import ObjectSerializerDisk
from invokeai.app.services.object_serializer.object_serializer_forward_cache import ObjectSerializerForwardCache


@dataclass
class MockDataclass:
    foo: str


def count_files(path: Path):
    return len(list(path.iterdir()))


@pytest.fixture
def obj_serializer(tmp_path: Path):
    return ObjectSerializerDisk[MockDataclass](tmp_path)


@pytest.fixture
def fwd_cache(tmp_path: Path):
    return ObjectSerializerForwardCache(ObjectSerializerDisk[MockDataclass](tmp_path), max_cache_size=2)


@pytest.fixture
def mock_invoker_with_logger():
    return Mock(Invoker, services=Mock(logger=Mock(Logger)))


def test_obj_serializer_disk_initializes(tmp_path: Path):
    obj_serializer = ObjectSerializerDisk[MockDataclass](tmp_path)
    assert obj_serializer._output_dir == tmp_path


def test_obj_serializer_disk_saves(obj_serializer: ObjectSerializerDisk[MockDataclass]):
    obj_1 = MockDataclass(foo="bar")
    obj_1_name = obj_serializer.save(obj_1)
    assert Path(obj_serializer._output_dir, obj_1_name).exists()

    obj_2 = MockDataclass(foo="baz")
    obj_2_name = obj_serializer.save(obj_2)
    assert Path(obj_serializer._output_dir, obj_2_name).exists()


def test_obj_serializer_disk_loads(obj_serializer: ObjectSerializerDisk[MockDataclass]):
    obj_1 = MockDataclass(foo="bar")
    obj_1_name = obj_serializer.save(obj_1)
    assert obj_serializer.load(obj_1_name).foo == "bar"

    obj_2 = MockDataclass(foo="baz")
    obj_2_name = obj_serializer.save(obj_2)
    assert obj_serializer.load(obj_2_name).foo == "baz"

    with pytest.raises(ObjectNotFoundError):
        obj_serializer.load("nonexistent_object_name")


def test_obj_serializer_disk_deletes(obj_serializer: ObjectSerializerDisk[MockDataclass]):
    obj_1 = MockDataclass(foo="bar")
    obj_1_name = obj_serializer.save(obj_1)

    obj_2 = MockDataclass(foo="bar")
    obj_2_name = obj_serializer.save(obj_2)

    obj_serializer.delete(obj_1_name)
    assert not Path(obj_serializer._output_dir, obj_1_name).exists()
    assert Path(obj_serializer._output_dir, obj_2_name).exists()


def test_obj_serializer_disk_deletes_all(obj_serializer: ObjectSerializerDisk[MockDataclass]):
    obj_1 = MockDataclass(foo="bar")
    obj_1_name = obj_serializer.save(obj_1)

    obj_2 = MockDataclass(foo="bar")
    obj_2_name = obj_serializer.save(obj_2)

    delete_all_result = obj_serializer._delete_all()

    assert not Path(obj_serializer._output_dir, obj_1_name).exists()
    assert not Path(obj_serializer._output_dir, obj_2_name).exists()
    assert delete_all_result.deleted_count == 2


def test_obj_serializer_disk_default_no_delete_on_startup(tmp_path: Path, mock_invoker_with_logger: Invoker):
    obj_serializer = ObjectSerializerDisk[MockDataclass](tmp_path)
    assert obj_serializer._delete_on_startup is False

    obj_1 = MockDataclass(foo="bar")
    obj_1_name = obj_serializer.save(obj_1)

    obj_serializer.start(mock_invoker_with_logger)
    assert Path(tmp_path, obj_1_name).exists()


def test_obj_serializer_disk_delete_on_startup(tmp_path: Path, mock_invoker_with_logger: Invoker):
    obj_serializer = ObjectSerializerDisk[MockDataclass](tmp_path, delete_on_startup=True)
    assert obj_serializer._delete_on_startup is True

    obj_1 = MockDataclass(foo="bar")
    obj_1_name = obj_serializer.save(obj_1)

    obj_serializer.start(mock_invoker_with_logger)
    assert not Path(tmp_path, obj_1_name).exists()


def test_obj_serializer_disk_different_types(tmp_path: Path):
    obj_serializer = ObjectSerializerDisk[MockDataclass](tmp_path)

    obj_1 = MockDataclass(foo="bar")
    obj_1_name = obj_serializer.save(obj_1)
    obj_1_loaded = obj_serializer.load(obj_1_name)
    assert isinstance(obj_1_loaded, MockDataclass)
    assert obj_1_loaded.foo == "bar"
    assert obj_1_name.startswith("MockDataclass_")

    obj_serializer = ObjectSerializerDisk[int](tmp_path)
    obj_2_name = obj_serializer.save(9001)
    assert obj_serializer.load(obj_2_name) == 9001
    assert obj_2_name.startswith("int_")

    obj_serializer = ObjectSerializerDisk[str](tmp_path)
    obj_3_name = obj_serializer.save("foo")
    assert obj_serializer.load(obj_3_name) == "foo"
    assert obj_3_name.startswith("str_")

    obj_serializer = ObjectSerializerDisk[torch.Tensor](tmp_path)
    obj_4_name = obj_serializer.save(torch.tensor([1, 2, 3]))
    obj_4_loaded = obj_serializer.load(obj_4_name)
    assert isinstance(obj_4_loaded, torch.Tensor)
    assert torch.equal(obj_4_loaded, torch.tensor([1, 2, 3]))
    assert obj_4_name.startswith("Tensor_")


def test_obj_serializer_fwd_cache_initializes(obj_serializer: ObjectSerializerDisk[MockDataclass]):
    fwd_cache = ObjectSerializerForwardCache(obj_serializer)
    assert fwd_cache._underlying_storage == obj_serializer


def test_obj_serializer_fwd_cache_saves_and_loads(fwd_cache: ObjectSerializerForwardCache[MockDataclass]):
    obj = MockDataclass(foo="bar")
    obj_name = fwd_cache.save(obj)
    obj_loaded = fwd_cache.load(obj_name)
    obj_underlying = fwd_cache._underlying_storage.load(obj_name)
    assert obj_loaded == obj_underlying
    assert obj_loaded.foo == "bar"


def test_obj_serializer_fwd_cache_respects_cache_size(fwd_cache: ObjectSerializerForwardCache[MockDataclass]):
    obj_1 = MockDataclass(foo="bar")
    obj_1_name = fwd_cache.save(obj_1)
    obj_2 = MockDataclass(foo="baz")
    obj_2_name = fwd_cache.save(obj_2)
    obj_3 = MockDataclass(foo="qux")
    obj_3_name = fwd_cache.save(obj_3)
    assert obj_1_name not in fwd_cache._cache
    assert obj_2_name in fwd_cache._cache
    assert obj_3_name in fwd_cache._cache
    # apparently qsize is "not reliable"?
    assert fwd_cache._cache_ids.qsize() == 2


def test_obj_serializer_fwd_cache_calls_delete_callback(fwd_cache: ObjectSerializerForwardCache[MockDataclass]):
    called_name = None
    obj_1 = MockDataclass(foo="bar")

    def on_deleted(name: str):
        nonlocal called_name
        called_name = name

    fwd_cache.on_deleted(on_deleted)
    obj_1_name = fwd_cache.save(obj_1)
    fwd_cache.delete(obj_1_name)
    assert called_name == obj_1_name
