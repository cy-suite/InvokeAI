import type { StyleProps } from '@chakra-ui/react';
import { Box, Flex } from '@chakra-ui/react';
import { overlayScrollbarsParams } from 'common/components/OverlayScrollbars/constants';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import type { CSSProperties, PropsWithChildren } from 'react';
import { memo } from 'react';

type Props = PropsWithChildren & {
  maxHeight?: StyleProps['maxHeight'];
};

const styles: CSSProperties = { height: '100%', width: '100%' };

const ScrollableContent = ({ children, maxHeight }: Props) => {
  return (
    <Flex w="full" h="full" maxHeight={maxHeight} position="relative">
      <Box position="absolute" top={0} left={0} right={0} bottom={0}>
        <OverlayScrollbarsComponent
          defer
          style={styles}
          options={overlayScrollbarsParams.options}
        >
          {children}
        </OverlayScrollbarsComponent>
      </Box>
    </Flex>
  );
};

export default memo(ScrollableContent);
