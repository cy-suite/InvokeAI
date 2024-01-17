import { forwardRef, Textarea as ChakraTextarea } from '@chakra-ui/react';
import { useGlobalModifiersSetters } from 'common/hooks/useGlobalModifiers';
import { stopPastePropagation } from 'common/util/stopPastePropagation';
import type { KeyboardEvent } from 'react';
import { memo, useCallback } from 'react';

import type { InvTextareaProps } from './types';

export const InvTextarea = memo(
  forwardRef<InvTextareaProps, typeof ChakraTextarea>(
    (props: InvTextareaProps, ref) => {
      const { ...rest } = props;
      const { setShift } = useGlobalModifiersSetters();
      const onKeyUpDown = useCallback(
        (e: KeyboardEvent<HTMLTextAreaElement>) => {
          setShift(e.shiftKey);
        },
        [setShift]
      );
      return (
        <ChakraTextarea
          ref={ref}
          onPaste={stopPastePropagation}
          onKeyUp={onKeyUpDown}
          onKeyDown={onKeyUpDown}
          minH={20}
          {...rest}
        />
      );
    }
  )
);

InvTextarea.displayName = 'InvTextarea';
