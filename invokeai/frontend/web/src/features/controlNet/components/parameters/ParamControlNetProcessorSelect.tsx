import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';

import IAIMantineSelect, {
  IAISelectDataType,
} from 'common/components/IAIMantineSelect';
import { map } from 'lodash-es';
import { memo, useCallback } from 'react';
import { CONTROLNET_PROCESSORS } from '../../store/constants';
import { controlNetProcessorTypeChanged } from '../../store/controlNetSlice';
import {
  ControlNetProcessorNode,
  ControlNetProcessorType,
} from '../../store/types';
import { useIsReadyToInvoke } from 'common/hooks/useIsReadyToInvoke';
import { createSelector } from '@reduxjs/toolkit';
import { configSelector } from 'features/system/store/configSelectors';
import { defaultSelectorOptions } from 'app/store/util/defaultMemoizeOptions';

type ParamControlNetProcessorSelectProps = {
  controlNetId: string;
  processorNode: ControlNetProcessorNode;
};

const selector = createSelector(
  configSelector,
  (config) => {
    const controlNetProcessors: IAISelectDataType[] = map(
      CONTROLNET_PROCESSORS,
      (p) => ({
        value: p.type,
        label: p.label,
      })
    )
      .sort((a, b) =>
        // sort 'none' to the top
        a.value === 'none'
          ? -1
          : b.value === 'none'
          ? 1
          : a.label.localeCompare(b.label)
      )
      .filter(
        (d) =>
          !config.sd.disabledControlNetProcessors.includes(
            d.value as ControlNetProcessorType
          )
      );

    return controlNetProcessors;
  },
  defaultSelectorOptions
);

const ParamControlNetProcessorSelect = (
  props: ParamControlNetProcessorSelectProps
) => {
  const { controlNetId, processorNode } = props;
  const dispatch = useAppDispatch();
  const isReady = useIsReadyToInvoke();
  const controlNetProcessors = useAppSelector(selector);

  const handleProcessorTypeChanged = useCallback(
    (v: string | null) => {
      dispatch(
        controlNetProcessorTypeChanged({
          controlNetId,
          processorType: v as ControlNetProcessorType,
        })
      );
    },
    [controlNetId, dispatch]
  );

  return (
    <IAIMantineSelect
      label="Processor"
      value={processorNode.type ?? 'canny_image_processor'}
      data={controlNetProcessors}
      onChange={handleProcessorTypeChanged}
      disabled={!isReady}
    />
  );
};

export default memo(ParamControlNetProcessorSelect);
