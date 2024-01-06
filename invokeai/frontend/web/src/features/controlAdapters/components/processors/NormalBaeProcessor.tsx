import { InvControl } from 'common/components/InvControl/InvControl';
import { InvSlider } from 'common/components/InvSlider/InvSlider';
import { useProcessorNodeChanged } from 'features/controlAdapters/components/hooks/useProcessorNodeChanged';
import { CONTROLNET_PROCESSORS } from 'features/controlAdapters/store/constants';
import type { RequiredNormalbaeImageProcessorInvocation } from 'features/controlAdapters/store/types';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import ProcessorWrapper from './common/ProcessorWrapper';

const DEFAULTS = CONTROLNET_PROCESSORS.normalbae_image_processor
  .default as RequiredNormalbaeImageProcessorInvocation;

type Props = {
  controlNetId: string;
  processorNode: RequiredNormalbaeImageProcessorInvocation;
  isEnabled: boolean;
};

const NormalBaeProcessor = (props: Props) => {
  const { controlNetId, processorNode, isEnabled } = props;
  const { image_resolution, detect_resolution } = processorNode;
  const processorChanged = useProcessorNodeChanged();
  const { t } = useTranslation();

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

  return (
    <ProcessorWrapper>
      <InvControl
        label={t('controlnet.detectResolution')}
        isDisabled={!isEnabled}
      >
        <InvSlider
          value={detect_resolution}
          onChange={handleDetectResolutionChanged}
          defaultValue={DEFAULTS.detect_resolution}
          min={0}
          max={4096}
          marks
          withNumberInput
        />
      </InvControl>
      <InvControl
        label={t('controlnet.imageResolution')}
        isDisabled={!isEnabled}
      >
        <InvSlider
          value={image_resolution}
          onChange={handleImageResolutionChanged}
          defaultValue={DEFAULTS.image_resolution}
          min={0}
          max={4096}
          marks
          withNumberInput
        />
      </InvControl>
    </ProcessorWrapper>
  );
};

export default memo(NormalBaeProcessor);
