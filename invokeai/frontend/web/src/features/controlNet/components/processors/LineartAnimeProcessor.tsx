import IAISlider from 'common/components/IAISlider';
import { CONTROLNET_PROCESSORS } from 'features/controlNet/store/constants';
import { RequiredLineartAnimeImageProcessorInvocation } from 'features/controlNet/store/types';
import { memo, useCallback } from 'react';
import { useProcessorNodeChanged } from '../hooks/useProcessorNodeChanged';
import ProcessorWrapper from './common/ProcessorWrapper';
import { useIsReadyToInvoke } from 'common/hooks/useIsReadyToInvoke';

const DEFAULTS = CONTROLNET_PROCESSORS.lineart_anime_image_processor.default;

type Props = {
  controlNetId: string;
  processorNode: RequiredLineartAnimeImageProcessorInvocation;
};

const LineartAnimeProcessor = (props: Props) => {
  const { controlNetId, processorNode } = props;
  const { image_resolution, detect_resolution } = processorNode;
  const processorChanged = useProcessorNodeChanged();
  const isReady = useIsReadyToInvoke();

  const handleDetectResolutionChanged = useCallback(
    (v: number) => {
      processorChanged(controlNetId, { detect_resolution: v });
    },
    [controlNetId, processorChanged]
  );

  const handleImageResolutionChanged = useCallback(
    (v: number) => {
      processorChanged(controlNetId, { image_resolution: v });
    },
    [controlNetId, processorChanged]
  );

  const handleDetectResolutionReset = useCallback(() => {
    processorChanged(controlNetId, {
      detect_resolution: DEFAULTS.detect_resolution,
    });
  }, [controlNetId, processorChanged]);

  const handleImageResolutionReset = useCallback(() => {
    processorChanged(controlNetId, {
      image_resolution: DEFAULTS.image_resolution,
    });
  }, [controlNetId, processorChanged]);

  return (
    <ProcessorWrapper>
      <IAISlider
        label="Detect Resolution"
        value={detect_resolution}
        onChange={handleDetectResolutionChanged}
        handleReset={handleDetectResolutionReset}
        withReset
        min={0}
        max={4096}
        withInput
        withSliderMarks
        isDisabled={!isReady}
      />
      <IAISlider
        label="Image Resolution"
        value={image_resolution}
        onChange={handleImageResolutionChanged}
        handleReset={handleImageResolutionReset}
        withReset
        min={0}
        max={4096}
        withInput
        withSliderMarks
        isDisabled={!isReady}
      />
    </ProcessorWrapper>
  );
};

export default memo(LineartAnimeProcessor);
