import { useDisclosure } from '@chakra-ui/react';
import { InvIconButton } from 'common/components/InvIconButton/InvIconButton';
import { InvMenuList } from 'common/components/InvMenu/InvMenuList';
import {
  InvMenu,
  InvMenuButton,
  InvMenuDivider,
} from 'common/components/InvMenu/wrapper';
import { useGlobalMenuClose } from 'common/hooks/useGlobalMenuClose';
import { useFeatureStatus } from 'features/system/hooks/useFeatureStatus';
import DownloadWorkflowMenuItem from 'features/workflowLibrary/components/WorkflowLibraryMenu/DownloadWorkflowMenuItem';
import NewWorkflowMenuItem from 'features/workflowLibrary/components/WorkflowLibraryMenu/NewWorkflowMenuItem';
import SaveWorkflowAsMenuItem from 'features/workflowLibrary/components/WorkflowLibraryMenu/SaveWorkflowAsMenuItem';
import SaveWorkflowMenuItem from 'features/workflowLibrary/components/WorkflowLibraryMenu/SaveWorkflowMenuItem';
import SettingsMenuItem from 'features/workflowLibrary/components/WorkflowLibraryMenu/SettingsMenuItem';
import UploadWorkflowMenuItem from 'features/workflowLibrary/components/WorkflowLibraryMenu/UploadWorkflowMenuItem';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { PiDotsThreeOutlineFill } from 'react-icons/pi';

const WorkflowLibraryMenu = () => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  useGlobalMenuClose(onClose);

  const isWorkflowLibraryEnabled =
    useFeatureStatus('workflowLibrary').isFeatureEnabled;

  return (
    <InvMenu isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
      <InvMenuButton
        as={InvIconButton}
        aria-label={t('workflows.workflowEditorMenu')}
        icon={<PiDotsThreeOutlineFill />}
        pointerEvents="auto"
      />
      <InvMenuList pointerEvents="auto">
        {isWorkflowLibraryEnabled && <SaveWorkflowMenuItem />}
        {isWorkflowLibraryEnabled && <SaveWorkflowAsMenuItem />}
        <DownloadWorkflowMenuItem />
        <UploadWorkflowMenuItem />
        <NewWorkflowMenuItem />
        <InvMenuDivider />
        <SettingsMenuItem />
      </InvMenuList>
    </InvMenu>
  );
};

export default memo(WorkflowLibraryMenu);
