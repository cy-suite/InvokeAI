import { Spacer } from '@chakra-ui/layout';
import { forwardRef, Tab as ChakraTab } from '@chakra-ui/react';
import { InvBadge } from 'common/components/InvBadge/wrapper';
import type { InvTabProps } from 'common/components/InvTabs/types';
import { memo } from 'react';

export const InvTab = memo(
  forwardRef<InvTabProps, typeof ChakraTab>((props: InvTabProps, ref) => {
    const { children, badges, ...rest } = props;
    return (
      <ChakraTab ref={ref} {...rest}>
        {children}
        <Spacer />
        {badges?.map((b, i) => (
          <InvBadge key={`${b}.${i}`} colorScheme="invokeYellow">
            {b}
          </InvBadge>
        ))}
      </ChakraTab>
    );
  })
);

InvTab.displayName = 'InvTab';
