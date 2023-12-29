import type { ChakraProps } from '@chakra-ui/react';
import { Flex } from '@chakra-ui/react';
import { memo, useCallback } from 'react';
import { RgbaColorPicker } from 'react-colorful';
import type {
  ColorPickerBaseProps,
  RgbaColor,
} from 'react-colorful/dist/types';

import { InvControl } from './InvControl/InvControl';
import { InvNumberInput } from './InvNumberInput/InvNumberInput';

type IAIColorPickerProps = ColorPickerBaseProps<RgbaColor> & {
  withNumberInput?: boolean;
};

const colorPickerStyles: NonNullable<ChakraProps['sx']> = {
  width: 6,
  height: 6,
  borderColor: 'base.100',
};

const sx: ChakraProps['sx'] = {
  '.react-colorful__hue-pointer': colorPickerStyles,
  '.react-colorful__saturation-pointer': colorPickerStyles,
  '.react-colorful__alpha-pointer': colorPickerStyles,
  gap: 2,
  flexDir: 'column',
};

const numberInputWidth: ChakraProps['w'] = '4.2rem';

const IAIColorPicker = (props: IAIColorPickerProps) => {
  const { color, onChange, withNumberInput, ...rest } = props;
  const handleChangeR = useCallback(
    (r: number) => onChange({ ...color, r }),
    [color, onChange]
  );
  const handleChangeG = useCallback(
    (g: number) => onChange({ ...color, g }),
    [color, onChange]
  );
  const handleChangeB = useCallback(
    (b: number) => onChange({ ...color, b }),
    [color, onChange]
  );
  const handleChangeA = useCallback(
    (a: number) => onChange({ ...color, a }),
    [color, onChange]
  );
  return (
    <Flex sx={sx}>
      <RgbaColorPicker
        color={color}
        onChange={onChange}
        style={{ width: '100%' }}
        {...rest}
      />
      {withNumberInput && (
        <Flex>
          <InvControl label="Red">
            <InvNumberInput
              value={color.r}
              onChange={handleChangeR}
              min={0}
              max={255}
              step={1}
              w={numberInputWidth}
            />
          </InvControl>
          <InvControl label="Green">
            <InvNumberInput
              value={color.g}
              onChange={handleChangeG}
              min={0}
              max={255}
              step={1}
              w={numberInputWidth}
            />
          </InvControl>
          <InvControl label="Blue">
            <InvNumberInput
              value={color.b}
              onChange={handleChangeB}
              min={0}
              max={255}
              step={1}
              w={numberInputWidth}
            />
          </InvControl>
          <InvControl label="Alpha">
            <InvNumberInput
              value={color.a}
              onChange={handleChangeA}
              step={0.1}
              min={0}
              max={1}
              w={numberInputWidth}
            />
          </InvControl>
        </Flex>
      )}
    </Flex>
  );
};

export default memo(IAIColorPicker);
