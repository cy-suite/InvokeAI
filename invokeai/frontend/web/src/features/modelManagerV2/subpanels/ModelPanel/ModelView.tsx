import { skipToken } from '@reduxjs/toolkit/query';
import { useAppDispatch, useAppSelector } from '../../../../app/store/storeHooks';
import { useGetModelMetadataQuery, useGetModelConfigQuery } from '../../../../services/api/endpoints/models';
import { Flex, Text, Heading, Button, Box } from '@invoke-ai/ui-library';
import DataViewer from '../../../gallery/components/ImageMetadataViewer/DataViewer';
import { useCallback, useMemo } from 'react';
import {
  CheckpointModelConfig,
  ControlNetConfig,
  DiffusersModelConfig,
  IPAdapterConfig,
  LoRAConfig,
  T2IAdapterConfig,
  TextualInversionConfig,
  VAEConfig,
} from '../../../../services/api/types';
import { ModelAttrView } from './ModelAttrView';
import { IoPencil } from 'react-icons/io5';
import { setSelectedModelMode } from '../../store/modelManagerV2Slice';

export const ModelView = () => {
  const dispatch = useAppDispatch();
  const selectedModelKey = useAppSelector((s) => s.modelmanagerV2.selectedModelKey);
  const { data, isLoading } = useGetModelConfigQuery(selectedModelKey ?? skipToken);
  const { data: metadata } = useGetModelMetadataQuery(selectedModelKey ?? skipToken);

  const modelData = useMemo(() => {
    if (!data) {
      return null;
    }
    const modelFormat = data.format;
    const modelType = data.type;

    if (modelType === 'main') {
      if (modelFormat === 'diffusers') {
        return data as DiffusersModelConfig;
      } else if (modelFormat === 'checkpoint') {
        return data as CheckpointModelConfig;
      }
    }

    switch (modelType) {
      case 'lora':
        return data as LoRAConfig;
      case 'embedding':
        return data as TextualInversionConfig;
      case 't2i_adapter':
        return data as T2IAdapterConfig;
      case 'ip_adapter':
        return data as IPAdapterConfig;
      case 'controlnet':
        return data as ControlNetConfig;
      case 'vae':
        return data as VAEConfig;
      default:
        return null;
    }
  }, [data]);

  const handleEditModel = useCallback(() => {
    dispatch(setSelectedModelMode('edit'));
  }, [dispatch]);

  if (isLoading) {
    return <Text>Loading</Text>;
  }

  if (!modelData) {
    return <Text>Something went wrong</Text>;
  }
  return (
    <Flex flexDir="column" h="full">
      <Flex w="full" justifyContent="space-between">
        <Flex flexDir="column" gap={1} p={2}>
          <Heading as="h2" fontSize="lg">
            {modelData.name}
          </Heading>

          {modelData.source && <Text variant="subtext">Source: {modelData.source}</Text>}
        </Flex>
        <Button size="sm" leftIcon={<IoPencil />} colorScheme="invokeYellow" onClick={handleEditModel}>
          Edit
        </Button>
      </Flex>

      <Flex flexDir="column" p={2} gap={3}>
        <Flex>
          <ModelAttrView label="Description" value={modelData.description} />
        </Flex>
        <Heading as="h3" fontSize="md" mt="4">
          Model Settings
        </Heading>
        <Box layerStyle="second" borderRadius="base" p={3}>
          <Flex flexDir="column" gap={3}>
            <Flex gap={2}>
              <ModelAttrView label="Base Model" value={modelData.base} />
              <ModelAttrView label="Model Type" value={modelData.type} />
            </Flex>
            <Flex gap={2}>
              <ModelAttrView label="Format" value={modelData.format} />
              <ModelAttrView label="Path" value={modelData.path} />
            </Flex>
            {modelData.type === 'main' && (
              <>
                <Flex gap={2}>
                  {modelData.format === 'diffusers' && (
                    <ModelAttrView label="Repo Variant" value={modelData.repo_variant} />
                  )}
                  {modelData.format === 'checkpoint' && <ModelAttrView label="Config Path" value={modelData.config} />}

                  <ModelAttrView label="Variant" value={modelData.variant} />
                </Flex>
                <Flex gap={2}>
                  <ModelAttrView label="Prediction Type" value={modelData.prediction_type} />
                  <ModelAttrView label="Upcast Attention" value={`${modelData.upcast_attention}`} />
                </Flex>
                <Flex gap={2}>
                  <ModelAttrView label="ZTSNR Training" value={`${modelData.ztsnr_training}`} />
                  <ModelAttrView label="VAE" value={modelData.vae} />
                </Flex>
              </>
            )}
            {modelData.type === 'ip_adapter' && (
              <Flex gap={2}>
                <ModelAttrView label="Image Encoder Model ID" value={modelData.image_encoder_model_id} />
              </Flex>
            )}
          </Flex>
        </Box>
      </Flex>

      {metadata && (
        <>
          <Heading as="h3" fontSize="md" mt="4">
            Model Metadata
          </Heading>
          <Flex h="full" w="full" p={2}>
            <DataViewer label="metadata" data={metadata} />
          </Flex>
        </>
      )}
    </Flex>
  );
};
