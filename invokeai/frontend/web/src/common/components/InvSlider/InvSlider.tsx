import {
  Slider as ChakraSlider,
  SliderFilledTrack as ChakraSliderFilledTrack,
  SliderThumb as ChakraSliderThumb,
  SliderTrack as ChakraSliderTrack,
  useFormControl,
} from '@chakra-ui/react';
import { useStore } from '@nanostores/react';
import { InvNumberInput } from 'common/components/InvNumberInput/InvNumberInput';
import { InvTooltip } from 'common/components/InvTooltip/InvTooltip';
import { $shift } from 'common/hooks/useGlobalModifiers';
import { AnimatePresence } from 'framer-motion';
import { isNil } from 'lodash-es';
import { memo, useCallback, useMemo, useState } from 'react';

import { InvSliderMark } from './InvSliderMark';
import type { InvFormattedMark, InvSliderProps } from './types';

export const InvSlider = memo((props: InvSliderProps) => {
  const {
    value,
    min,
    max,
    step: _step = 1,
    fineStep: _fineStep,
    onChange,
    onReset: _onReset,
    defaultValue,
    formatValue = (v: number) => v.toString(),
    marks: _marks,
    withThumbTooltip: withTooltip = false,
    withNumberInput = false,
    numberInputMin = min,
    numberInputMax = max,
    numberInputWidth,
    ...sliderProps
  } = props;
  const [isMouseOverSlider, setIsMouseOverSlider] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const shift = useStore($shift);
  const step = useMemo(
    () => (shift ? _fineStep ?? _step : _step),
    [shift, _fineStep, _step]
  );
  const controlProps = useFormControl({});

  const label = useMemo(() => formatValue(value), [formatValue, value]);

  const onMouseEnter = useCallback(() => setIsMouseOverSlider(true), []);
  const onMouseLeave = useCallback(() => setIsMouseOverSlider(false), []);
  const onChangeStart = useCallback(() => setIsChanging(true), []);
  const onChangeEnd = useCallback(() => setIsChanging(false), []);

  const marks = useMemo<InvFormattedMark[]>(() => {
    if (_marks === true) {
      return [min, max].map((m) => ({ value: m, label: formatValue(m) }));
    }
    if (_marks) {
      return _marks?.map((m) => ({ value: m, label: formatValue(m) }));
    }
    return [];
  }, [_marks, formatValue, max, min]);

  const onReset = useCallback(() => {
    if (!isNil(defaultValue)) {
      onChange(defaultValue);
    }
    if (_onReset) {
      _onReset();
    }
  }, [defaultValue, onChange, _onReset]);

  return (
    <>
      <ChakraSlider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        focusThumbOnChange={false}
        onChangeStart={onChangeStart}
        onChangeEnd={onChangeEnd}
        {...sliderProps}
        {...controlProps}
      >
        <AnimatePresence>
          {marks?.length &&
            (isMouseOverSlider || isChanging) &&
            marks.map((m, i) => (
              <InvSliderMark
                key={m.value}
                value={m.value}
                label={m.label}
                index={i}
                total={marks.length}
              />
            ))}
        </AnimatePresence>

        <ChakraSliderTrack>
          <ChakraSliderFilledTrack />
        </ChakraSliderTrack>

        <InvTooltip
          isOpen={withTooltip && (isMouseOverSlider || isChanging)}
          label={label}
        >
          <ChakraSliderThumb onDoubleClick={onReset} zIndex={0} />
        </InvTooltip>
      </ChakraSlider>
      {withNumberInput && (
        <InvNumberInput
          value={value}
          defaultValue={defaultValue}
          min={numberInputMin}
          max={numberInputMax}
          step={step}
          onChange={onChange}
          w={numberInputWidth}
        />
      )}
    </>
  );
});

InvSlider.displayName = 'InvSlider';
