import { Flex, Text } from '@invoke-ai/ui-library';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ALL_BASE_MODELS } from 'services/api/constants';
import { useGetLoRAModelsQuery, useGetMainModelsQuery } from 'services/api/endpoints/models';
import type { DiffusersModelConfig, LoRAConfig, MainModelConfig } from 'services/api/types';

import CheckpointModelEdit from './ModelManagerPanel/CheckpointModelEdit';
import DiffusersModelEdit from './ModelManagerPanel/DiffusersModelEdit';
import LoRAModelEdit from './ModelManagerPanel/LoRAModelEdit';
import ModelList from './ModelManagerPanel/ModelList';

const ModelManagerPanel = () => {
  const [selectedModelId, setSelectedModelId] = useState<string>();
  const { mainModel } = useGetMainModelsQuery(ALL_BASE_MODELS, {
    selectFromResult: ({ data }) => ({
      mainModel: selectedModelId ? data?.entities[selectedModelId] : undefined,
    }),
  });
  const { loraModel } = useGetLoRAModelsQuery(undefined, {
    selectFromResult: ({ data }) => ({
      loraModel: selectedModelId ? data?.entities[selectedModelId] : undefined,
    }),
  });

  const model = mainModel ? mainModel : loraModel;

  return (
    <Flex gap={8} w="full" h="full">
      <ModelList selectedModelId={selectedModelId} setSelectedModelId={setSelectedModelId} />
      <ModelEdit model={model} />
    </Flex>
  );
};

type ModelEditProps = {
  model: MainModelConfig | LoRAConfig | undefined;
};

const ModelEdit = (props: ModelEditProps) => {
  const { t } = useTranslation();
  const { model } = props;

  if (model?.format === 'checkpoint') {
    return <CheckpointModelEdit key={model.key} model={model} />;
  }

  if (model?.format === 'diffusers') {
    return <DiffusersModelEdit key={model.key} model={model as DiffusersModelConfig} />;
  }

  if (model?.type === 'lora') {
    return <LoRAModelEdit key={model.key} model={model} />;
  }

  return (
    <Flex w="full" h="full" justifyContent="center" alignItems="center" maxH={96} userSelect="none">
      <Text variant="subtext">{t('modelManager.noModelSelected')}</Text>
    </Flex>
  );
};

export default memo(ModelManagerPanel);
