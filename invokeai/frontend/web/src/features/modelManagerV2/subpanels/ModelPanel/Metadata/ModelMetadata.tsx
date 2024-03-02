import { Flex, Box } from '@invoke-ai/ui-library';
import { skipToken } from '@reduxjs/toolkit/query';
import { useAppSelector } from '../../../../../app/store/storeHooks';
import { useGetModelMetadataQuery } from '../../../../../services/api/endpoints/models';
import DataViewer from '../../../../gallery/components/ImageMetadataViewer/DataViewer';
import { TriggerPhrases } from './TriggerPhrases';

export const ModelMetadata = () => {
  const selectedModelKey = useAppSelector((s) => s.modelmanagerV2.selectedModelKey);
  const { data: metadata } = useGetModelMetadataQuery(selectedModelKey ?? skipToken);

  return (
    <>
      <Flex flexDir="column" height="full" gap="3">
        <Box layerStyle="second" borderRadius="base" p={3}>
          <TriggerPhrases />
        </Box>
        <DataViewer label="metadata" data={metadata || {}} />
      </Flex>
    </>
  );
};
