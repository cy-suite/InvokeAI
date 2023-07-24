import ast
import pathlib
from collections import OrderedDict
from typing import Dict, List

from pydantic import BaseModel, ValidationError

from ...backend.util.logging import getLogger
from ..services.config import get_invokeai_config
from .extension_config_manager import ExtensionConfigManager
from .util import unique_list


class Extension(BaseModel):
    name: str
    path: pathlib.Path


class InvokeAIExtensionManager():
    """
    InvokeAI's Extension Manager - Controls all extension related operations.
    """

    def __init__(self) -> None:
        self.logger = getLogger('Extension Manager')
        self.config = get_invokeai_config()
        self.community_nodes_dir: pathlib.Path = self.config.nodes_path
        assert self.community_nodes_dir.is_dir()

    def get_extensions(self) -> Dict[str, Extension]:
        """ Returns an object with paths to all folders in the extension directory """
        available_extensions: Dict[str, Extension] = {}

        for extension in self.community_nodes_dir.iterdir():
            if extension.is_dir() and not extension.name.startswith('__'):
                available_extensions[extension.stem] = Extension(
                    name=extension.stem, path=extension)
                
        return available_extensions
    
    def get_extension_config(self, extension: Extension):
        extension_config_file = extension.path / 'config.yaml'

        if extension_config_file.is_file():
            try:
                extension_config_manager = ExtensionConfigManager(extension_config_file)
                return extension_config_manager.config
            except ValidationError as e:
                for error in e.errors():
                    self.logger.error(f"{extension.name}: Config Validation Failed - {error['loc']}: {error['msg']} ({error['type']})")
        else:
            self.logger.warn(f'No config found for extension: {extension.name}')

    def load_extension(self, extension: Extension) -> List | None:
        """
        Takes an `Extension` and returns a `list` of all node files that contain Invocations
        in that extension, which can then be appended to the original extension list.
        Returns `None` if no Invocations are found.
        """
        extension_name = extension.name
        
        extension_config = self.get_extension_config(extension)
        if extension_config:
            extension_name = extension_config.name or extension_name

        # Search for py files that are not named __init__.py in extensions root directory
        py_files = list(extension.path.glob('*.py'))
        py_files = [
            file for file in py_files if not file.name == "__init__.py"]

        if len(py_files) == 0:
            self.logger.warn(
                f'Extension: "{extension_name}" failed to load. No node files found.')
            return None

        # Every py file in the root directory of the extension is loaded as an invocation
        # This will allow people to pack multiple nodes in different files in the same extension
        # All subfolders are ignored. These can be used for secondary operations needed for the node.
        loaded_nodes = []
        nodes_found = []
        nodes_not_found = []
        for file in py_files:
            with open(file) as nodefile:
                node_file = ast.parse(nodefile.read())
                classes = [n for n in node_file.body
                           if isinstance(n, ast.ClassDef)]
                invocations = [c.name.replace('Invocation', '') for c in classes
                               if c.name.endswith("Invocation")]

            if len(invocations) == 0:
                nodes_not_found.append(file.name)
                continue

            nodes_found.extend(invocations)
            loaded_nodes.append((file.parent / file.stem).__str__())

        if len(loaded_nodes) > 0:
            self.logger.info(
                f'Extension: {extension_name}, Nodes: {nodes_found} - LOADED!')
        if len(nodes_not_found) > 0:
            self.logger.warn(
                f'Extension: {extension_name}, No Nodes Found In: {nodes_not_found} - NOT LOADED!')

        return unique_list(loaded_nodes) if len(loaded_nodes) > 0 else None

    def load_extensions(self) -> List:
        loaded_extensions = []
        available_extensions = self.get_extensions()

        for extension in available_extensions.values():
            loaded_extension = self.load_extension(extension)
            if loaded_extension and loaded_extension not in loaded_extensions:
                loaded_extensions.extend(loaded_extension)
                
        return unique_list(loaded_extensions)