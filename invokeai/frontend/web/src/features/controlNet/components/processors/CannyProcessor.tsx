import IAISlider from 'common/components/IAISlider';
import { CONTROLNET_PROCESSORS } from 'features/controlNet/store/constants';
import { RequiredCannyImageProcessorInvocation } from 'features/controlNet/store/types';
import { memo, useCallback } from 'react';
import { useProcessorNodeChanged } from '../hooks/useProcessorNodeChanged';
import ProcessorWrapper from './common/ProcessorWrapper';
import { useIsReadyToInvoke } from 'common/hooks/useIsReadyToInvoke';

const DEFAULTS = CONTROLNET_PROCESSORS.canny_image_processor.default;

type CannyProcessorProps = {
  controlNetId: string;
  processorNode: RequiredCannyImageProcessorInvocation;
};

const CannyProcessor = (props: CannyProcessorProps) => {
  const { controlNetId, processorNode } = props;
  const { low_threshold, high_threshold } = processorNode;
  const isReady = useIsReadyToInvoke();
  const processorChanged = useProcessorNodeChanged();

  const handleLowThresholdChanged = useCallback(
    (v: number) => {
      processorChanged(controlNetId, { low_threshold: v });
    },
    [controlNetId, processorChanged]
  );

  const handleLowThresholdReset = useCallback(() => {
    processorChanged(controlNetId, {
      low_threshold: DEFAULTS.low_threshold,
    });
  }, [controlNetId, processorChanged]);

  const handleHighThresholdChanged = useCallback(
    (v: number) => {
      processorChanged(controlNetId, { high_threshold: v });
    },
    [controlNetId, processorChanged]
  );

  const handleHighThresholdReset = useCallback(() => {
    processorChanged(controlNetId, {
      high_threshold: DEFAULTS.high_threshold,
    });
  }, [controlNetId, processorChanged]);

  return (
    <ProcessorWrapper>
      <IAISlider
        isDisabled={!isReady}
        label="Low Threshold"
        value={low_threshold}
        onChange={handleLowThresholdChanged}
        handleReset={handleLowThresholdReset}
        withReset
        min={0}
        max={255}
        withInput
        withSliderMarks
      />
      <IAISlider
        isDisabled={!isReady}
        label="High Threshold"
        value={high_threshold}
        onChange={handleHighThresholdChanged}
        handleReset={handleHighThresholdReset}
        withReset
        min={0}
        max={255}
        withInput
        withSliderMarks
      />
    </ProcessorWrapper>
  );
};

export default memo(CannyProcessor);
