import { Flex } from '@chakra-ui/react';
import { skipToken } from '@reduxjs/toolkit/query';
import { createMemoizedSelector } from 'app/store/createMemoizedSelector';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { InvButton } from 'common/components/InvButton/InvButton';
import { InvButtonGroup } from 'common/components/InvButtonGroup/InvButtonGroup';
import { stagingAreaImageSaved } from 'features/canvas/store/actions';
import {
  commitStagingAreaImage,
  discardStagedImages,
  nextStagingAreaImage,
  prevStagingAreaImage,
  selectCanvasSlice,
  setShouldShowStagingImage,
  setShouldShowStagingOutline,
} from 'features/canvas/store/canvasSlice';
import { InvIconButton } from 'index';
import { memo, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTranslation } from 'react-i18next';
import {
  PiArrowLeftBold,
  PiArrowRightBold,
  PiCheckBold,
  PiEyeBold,
  PiEyeSlashBold,
  PiFloppyDiskBold,
  PiXBold,
} from 'react-icons/pi';
import { useGetImageDTOQuery } from 'services/api/endpoints/images';

const selector = createMemoizedSelector(selectCanvasSlice, (canvas) => {
  const {
    layerState: {
      stagingArea: { images, selectedImageIndex },
    },
    shouldShowStagingOutline,
    shouldShowStagingImage,
  } = canvas;

  return {
    currentIndex: selectedImageIndex,
    total: images.length,
    currentStagingAreaImage:
      images.length > 0 ? images[selectedImageIndex] : undefined,
    shouldShowStagingImage,
    shouldShowStagingOutline,
  };
});

const IAICanvasStagingAreaToolbar = () => {
  const dispatch = useAppDispatch();
  const {
    currentStagingAreaImage,
    shouldShowStagingImage,
    currentIndex,
    total,
  } = useAppSelector(selector);

  const { t } = useTranslation();

  const handleMouseOver = useCallback(() => {
    dispatch(setShouldShowStagingOutline(true));
  }, [dispatch]);

  const handleMouseOut = useCallback(() => {
    dispatch(setShouldShowStagingOutline(false));
  }, [dispatch]);

  const handlePrevImage = useCallback(
    () => dispatch(prevStagingAreaImage()),
    [dispatch]
  );

  const handleNextImage = useCallback(
    () => dispatch(nextStagingAreaImage()),
    [dispatch]
  );

  const handleAccept = useCallback(
    () => dispatch(commitStagingAreaImage()),
    [dispatch]
  );

  useHotkeys(['left'], handlePrevImage, {
    enabled: () => true,
    preventDefault: true,
  });

  useHotkeys(['right'], handleNextImage, {
    enabled: () => true,
    preventDefault: true,
  });

  useHotkeys(['enter'], () => handleAccept, {
    enabled: () => true,
    preventDefault: true,
  });

  const { data: imageDTO } = useGetImageDTOQuery(
    currentStagingAreaImage?.imageName ?? skipToken
  );

  const handleToggleShouldShowStagingImage = useCallback(() => {
    dispatch(setShouldShowStagingImage(!shouldShowStagingImage));
  }, [dispatch, shouldShowStagingImage]);

  const handleSaveToGallery = useCallback(() => {
    if (!imageDTO) {
      return;
    }

    dispatch(
      stagingAreaImageSaved({
        imageDTO,
      })
    );
  }, [dispatch, imageDTO]);

  const handleDiscardStagingArea = useCallback(() => {
    dispatch(discardStagedImages());
  }, [dispatch]);

  if (!currentStagingAreaImage) {
    return null;
  }

  return (
    <Flex
      pos="absolute"
      bottom={4}
      gap={2}
      w="100%"
      align="center"
      justify="center"
      onMouseEnter={handleMouseOver}
      onMouseLeave={handleMouseOut}
    >
      <InvButtonGroup borderRadius="base" shadow="dark-lg">
        <InvIconButton
          tooltip={`${t('unifiedCanvas.previous')} (Left)`}
          aria-label={`${t('unifiedCanvas.previous')} (Left)`}
          icon={<PiArrowLeftBold />}
          onClick={handlePrevImage}
          colorScheme="invokeBlue"
          isDisabled={!shouldShowStagingImage}
        />
        <InvButton
          colorScheme="base"
          pointerEvents="none"
          isDisabled={!shouldShowStagingImage}
          minW={20}
        >{`${currentIndex + 1}/${total}`}</InvButton>
        <InvIconButton
          tooltip={`${t('unifiedCanvas.next')} (Right)`}
          aria-label={`${t('unifiedCanvas.next')} (Right)`}
          icon={<PiArrowRightBold />}
          onClick={handleNextImage}
          colorScheme="invokeBlue"
          isDisabled={!shouldShowStagingImage}
        />
      </InvButtonGroup>
      <InvButtonGroup borderRadius="base" shadow="dark-lg">
        <InvIconButton
          tooltip={`${t('unifiedCanvas.accept')} (Enter)`}
          aria-label={`${t('unifiedCanvas.accept')} (Enter)`}
          icon={<PiCheckBold />}
          onClick={handleAccept}
          colorScheme="invokeBlue"
        />
        <InvIconButton
          tooltip={
            shouldShowStagingImage
              ? t('unifiedCanvas.showResultsOn')
              : t('unifiedCanvas.showResultsOff')
          }
          aria-label={
            shouldShowStagingImage
              ? t('unifiedCanvas.showResultsOn')
              : t('unifiedCanvas.showResultsOff')
          }
          data-alert={!shouldShowStagingImage}
          icon={shouldShowStagingImage ? <PiEyeBold /> : <PiEyeSlashBold />}
          onClick={handleToggleShouldShowStagingImage}
          colorScheme="invokeBlue"
        />
        <InvIconButton
          tooltip={t('unifiedCanvas.saveToGallery')}
          aria-label={t('unifiedCanvas.saveToGallery')}
          isDisabled={!imageDTO || !imageDTO.is_intermediate}
          icon={<PiFloppyDiskBold />}
          onClick={handleSaveToGallery}
          colorScheme="invokeBlue"
        />
        <InvIconButton
          tooltip={t('unifiedCanvas.discardAll')}
          aria-label={t('unifiedCanvas.discardAll')}
          icon={<PiXBold />}
          onClick={handleDiscardStagingArea}
          colorScheme="error"
          fontSize={20}
        />
      </InvButtonGroup>
    </Flex>
  );
};

export default memo(IAICanvasStagingAreaToolbar);
