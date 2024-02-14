import { Flex, Icon, Spacer, Text, Tooltip } from '@invoke-ai/ui-library';
import { useAppSelector } from 'app/store/storeHooks';
import { PiInfoBold } from 'react-icons/pi';

import WorkflowInfoTooltipContent from './viewMode/WorkflowInfoTooltipContent';
import { WorkflowWarning } from './viewMode/WorkflowWarning';

export const WorkflowName = () => {
  const name = useAppSelector((s) => s.workflow.name);

  return (
    <>
      {name.length ? (
        <Flex gap="2" alignItems="center">
          <Tooltip label={<WorkflowInfoTooltipContent />} placement="top">
            <Flex gap="2" alignItems="center">
              <Text fontSize="lg" userSelect="none" noOfLines={1} wordBreak="break-all" fontWeight="semibold">
                {name}
              </Text>

              <Flex h="full" alignItems="center" gap="2">
                <Icon fontSize="lg" color="base.300" as={PiInfoBold} />
              </Flex>
            </Flex>
          </Tooltip>
          <WorkflowWarning />
        </Flex>
      ) : (
        <Spacer />
      )}
    </>
  );
};
