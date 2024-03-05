import { Box, Flex } from '@invoke-ai/ui-library';
import { skipToken } from '@reduxjs/toolkit/query';
import { useAppSelector } from 'app/store/storeHooks';
import DataViewer from 'features/gallery/components/ImageMetadataViewer/DataViewer';
import { useGetModelConfigQuery } from 'services/api/endpoints/models';

import { TriggerPhrases } from './TriggerPhrases';

export const ModelMetadata = () => {
  const selectedModelKey = useAppSelector((s) => s.modelmanagerV2.selectedModelKey);
  const { data } = useGetModelConfigQuery(selectedModelKey ?? skipToken);

  return (
    <Flex flexDir="column" height="full" gap="3">
      <Box layerStyle="second" borderRadius="base" p={3}>
        <TriggerPhrases />
      </Box>
      <DataViewer label="metadata" data={data?.source_api_response || {}} />
    </Flex>
  );
};
