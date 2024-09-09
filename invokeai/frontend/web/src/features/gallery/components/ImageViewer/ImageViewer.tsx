import { Box, Flex } from '@invoke-ai/ui-library';
import { useAppSelector } from 'app/store/storeHooks';
import { useScopeOnFocus, useScopeOnMount } from 'common/hooks/interactionScopes';
import { CompareToolbar } from 'features/gallery/components/ImageViewer/CompareToolbar';
import CurrentImagePreview from 'features/gallery/components/ImageViewer/CurrentImagePreview';
import { ImageComparison } from 'features/gallery/components/ImageViewer/ImageComparison';
import { ImageComparisonDroppable } from 'features/gallery/components/ImageViewer/ImageComparisonDroppable';
import { ViewerToolbar } from 'features/gallery/components/ImageViewer/ViewerToolbar';
import { selectHasImageToCompare } from 'features/gallery/store/gallerySelectors';
import { memo, useRef } from 'react';
import { useMeasure } from 'react-use';

export const ImageViewer = memo(() => {
  const hasImageToCompare = useAppSelector(selectHasImageToCompare);
  const [containerRef, containerDims] = useMeasure<HTMLDivElement>();
  const ref = useRef<HTMLDivElement>(null);
  useScopeOnFocus('imageViewer', ref);
  useScopeOnMount('imageViewer');

  return (
    <Flex
      ref={ref}
      tabIndex={-1}
      layerStyle="first"
      p={2}
      borderRadius="base"
      position="absolute"
      flexDirection="column"
      top={0}
      right={0}
      bottom={0}
      left={0}
      rowGap={4}
      alignItems="center"
      justifyContent="center"
    >
      {hasImageToCompare && <CompareToolbar />}
      {!hasImageToCompare && <ViewerToolbar />}
      <Box ref={containerRef} w="full" h="full">
        {!hasImageToCompare && <CurrentImagePreview />}
        {hasImageToCompare && <ImageComparison containerDims={containerDims} />}
      </Box>
      <ImageComparisonDroppable />
    </Flex>
  );
});

ImageViewer.displayName = 'ImageViewer';
