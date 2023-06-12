import IAICustomSelect, {
  IAICustomSelectOption,
} from 'common/components/IAICustomSelect';
import { ChangeEvent, memo, useCallback } from 'react';
import {
  ControlNetProcessorNode,
  ControlNetProcessorType,
} from '../../store/types';
import { controlNetProcessorTypeChanged } from '../../store/controlNetSlice';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { CONTROLNET_PROCESSORS } from '../../store/constants';
import { map } from 'lodash-es';
import { useIsReadyToInvoke } from 'common/hooks/useIsReadyToInvoke';
import IAISelect from 'common/components/IAISelect';
import { createSelector } from '@reduxjs/toolkit';
import { configSelector } from 'features/system/store/configSelectors';

type ParamControlNetProcessorSelectProps = {
  controlNetId: string;
  processorNode: ControlNetProcessorNode;
};

const CONTROLNET_PROCESSOR_TYPES = map(CONTROLNET_PROCESSORS, (p) => ({
  value: p.type,
  key: p.label,
})).sort((a, b) =>
  // sort 'none' to the top
  a.value === 'none' ? -1 : b.value === 'none' ? 1 : a.key.localeCompare(b.key)
);

const selector = createSelector(configSelector, (config) => {
  return map(CONTROLNET_PROCESSORS, (p) => ({
    value: p.type,
    key: p.label,
  }))
    .sort((a, b) =>
      // sort 'none' to the top
      a.value === 'none'
        ? -1
        : b.value === 'none'
        ? 1
        : a.key.localeCompare(b.key)
    )
    .filter((d) => !config.sd.disabledControlNetProcessors.includes(d.value));
});

// const CONTROLNET_PROCESSOR_TYPES: IAICustomSelectOption[] = map(
//   CONTROLNET_PROCESSORS,
//   (p) => ({
//     value: p.type,
//     label: p.label,
//     tooltip: p.description,
//   })
// ).sort((a, b) =>
//   // sort 'none' to the top
//   a.value === 'none'
//     ? -1
//     : b.value === 'none'
//     ? 1
//     : a.label.localeCompare(b.label)
// );

const ParamControlNetProcessorSelect = (
  props: ParamControlNetProcessorSelectProps
) => {
  const { controlNetId, processorNode } = props;
  const dispatch = useAppDispatch();
  const isReady = useIsReadyToInvoke();
  const controlNetProcessors = useAppSelector(selector);

  const handleProcessorTypeChanged = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      dispatch(
        controlNetProcessorTypeChanged({
          controlNetId,
          processorType: e.target.value as ControlNetProcessorType,
        })
      );
    },
    [controlNetId, dispatch]
  );
  // const handleProcessorTypeChanged = useCallback(
  //   (v: string | null | undefined) => {
  //     dispatch(
  //       controlNetProcessorTypeChanged({
  //         controlNetId,
  //         processorType: v as ControlNetProcessorType,
  //       })
  //     );
  //   },
  //   [controlNetId, dispatch]
  // );

  return (
    <IAISelect
      label="Processor"
      value={processorNode.type ?? 'canny_image_processor'}
      validValues={controlNetProcessors}
      onChange={handleProcessorTypeChanged}
      isDisabled={!isReady}
    />
  );
  // return (
  //   <IAICustomSelect
  //     label="Processor"
  //     value={processorNode.type ?? 'canny_image_processor'}
  //     data={CONTROLNET_PROCESSOR_TYPES}
  //     onChange={handleProcessorTypeChanged}
  //     withCheckIcon
  //     isDisabled={!isReady}
  //   />
  // );
};

export default memo(ParamControlNetProcessorSelect);
