import { FormControl, FormLabel, CompositeSlider, CompositeNumberInput, Flex } from '@invoke-ai/ui-library';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../../../../app/store/storeHooks';
import { InformationalPopover } from '../../../../../common/components/InformationalPopover/InformationalPopover';
import { UseControllerProps, useController } from 'react-hook-form';
import { DefaultSettingsFormData } from '../DefaultSettings';
import { useCallback } from 'react';

type DefaultCfgType = DefaultSettingsFormData['cfgScale'];

export function DefaultCfgScale(props: UseControllerProps<DefaultSettingsFormData>) {
  const { field } = useController(props);

  const sliderMin = useAppSelector((s) => s.config.sd.guidance.sliderMin);
  const sliderMax = useAppSelector((s) => s.config.sd.guidance.sliderMax);
  const numberInputMin = useAppSelector((s) => s.config.sd.guidance.numberInputMin);
  const numberInputMax = useAppSelector((s) => s.config.sd.guidance.numberInputMax);
  const coarseStep = useAppSelector((s) => s.config.sd.guidance.coarseStep);
  const fineStep = useAppSelector((s) => s.config.sd.guidance.fineStep);
  const { t } = useTranslation();
  const marks = useMemo(() => [sliderMin, Math.floor(sliderMax / 2), sliderMax], [sliderMax, sliderMin]);

  const onChange = useCallback(
    (v: number) => {
      const updatedValue = {
        ...(field.value as DefaultCfgType),
        value: v,
      };
      field.onChange(updatedValue);
    },
    [field]
  );

  const value = useMemo(() => {
    return (field.value as DefaultCfgType).value;
  }, [field.value]);

  const isDisabled = useMemo(() => {
    return !(field.value as DefaultCfgType).isEnabled;
  }, [field.value]);

  return (
    <FormControl flexDir="column" gap={1} alignItems="flex-start">
      <InformationalPopover feature="paramCFGScale">
        <FormLabel>{t('parameters.cfgScale')}</FormLabel>
      </InformationalPopover>
      <Flex w="full" gap={1}>
        <CompositeSlider
          value={value}
          min={sliderMin}
          max={sliderMax}
          step={coarseStep}
          fineStep={fineStep}
          onChange={onChange}
          marks={marks}
          isDisabled={isDisabled}
        />
        <CompositeNumberInput
          value={value}
          min={numberInputMin}
          max={numberInputMax}
          step={coarseStep}
          fineStep={fineStep}
          onChange={onChange}
          isDisabled={isDisabled}
        />
      </Flex>
    </FormControl>
  );
}
