import { Flex } from '@chakra-ui/react';
import { useFeatureStatus } from 'features/system/hooks/useFeatureStatus';
import WorkflowLibraryButton from 'features/workflowLibrary/components/WorkflowLibraryButton';
import WorkflowLibraryMenu from 'features/workflowLibrary/components/WorkflowLibraryMenu/WorkflowLibraryMenu';
import { memo } from 'react';

const TopRightPanel = () => {
  const isWorkflowLibraryEnabled =
    useFeatureStatus('workflowLibrary').isFeatureEnabled;

  return (
    <Flex gap={2} position="absolute" top={2} insetInlineEnd={2}>
      {isWorkflowLibraryEnabled && <WorkflowLibraryButton />}
      <WorkflowLibraryMenu />
    </Flex>
  );
};

export default memo(TopRightPanel);
