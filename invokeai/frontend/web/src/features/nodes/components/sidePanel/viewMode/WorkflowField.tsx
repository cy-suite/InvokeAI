import { Flex, FormLabel, Icon, IconButton, Spacer, Tooltip } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import FieldTooltipContent from 'features/nodes/components/flow/nodes/Invocation/fields/FieldTooltipContent';
import InputFieldRenderer from 'features/nodes/components/flow/nodes/Invocation/fields/InputFieldRenderer';
import { useFieldInstance } from 'features/nodes/hooks/useFieldData';
import { useFieldLabel } from 'features/nodes/hooks/useFieldLabel';
import { useFieldTemplateTitle } from 'features/nodes/hooks/useFieldTemplateTitle';
import { fieldValueReset } from 'features/nodes/store/nodesSlice';
import { HANDLE_TOOLTIP_OPEN_DELAY } from 'features/nodes/types/constants';
import { t } from 'i18next';
import { memo, useCallback, useMemo } from 'react';
import { PiArrowCounterClockwiseBold, PiInfoBold } from 'react-icons/pi';

type Props = {
  nodeId: string;
  fieldName: string;
};

const WorkflowField = ({ nodeId, fieldName }: Props) => {
  const label = useFieldLabel(nodeId, fieldName);
  const dispatch = useAppDispatch();
  const fieldTemplateTitle = useFieldTemplateTitle(nodeId, fieldName, 'input');
  const fieldInstance = useFieldInstance(nodeId, fieldName);
  const { originalExposedFieldValues } = useAppSelector((s) => s.workflow);

  const originalValue = useMemo(() => {
    return originalExposedFieldValues.find((originalValues) => originalValues.nodeId === nodeId)?.value;
  }, [originalExposedFieldValues, nodeId]);

  const handleResetField = useCallback(() => {
    dispatch(fieldValueReset({ nodeId, fieldName, value: originalValue }));
  }, [dispatch, fieldName, nodeId, originalValue]);

  return (
    <Flex layerStyle="second" position="relative" borderRadius="base" w="full" p={4} gap="2" flexDir="column">
      <Flex alignItems="center">
        <FormLabel fontSize="sm">{label || fieldTemplateTitle}</FormLabel>

        <Spacer />
        {originalValue !== fieldInstance?.value && (
          <IconButton
            aria-label={t('nodes.resetToDefaultValue')}
            tooltip={t('nodes.resetToDefaultValue')}
            variant="ghost"
            size="sm"
            onClick={handleResetField}
            icon={<PiArrowCounterClockwiseBold />}
          />
        )}
        <Tooltip
          label={<FieldTooltipContent nodeId={nodeId} fieldName={fieldName} kind="input" />}
          openDelay={HANDLE_TOOLTIP_OPEN_DELAY}
          placement="top"
        >
          <Flex h="24px" alignItems="center">
            <Icon fontSize="md" color="base.300" as={PiInfoBold} />
          </Flex>
        </Tooltip>
      </Flex>
      <InputFieldRenderer nodeId={nodeId} fieldName={fieldName} />
    </Flex>
  );
};

export default memo(WorkflowField);
