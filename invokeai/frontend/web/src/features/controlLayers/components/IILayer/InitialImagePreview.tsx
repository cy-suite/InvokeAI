import type { SystemStyleObject } from '@invoke-ai/ui-library';
import { Flex, useShiftModifier } from '@invoke-ai/ui-library';
import { skipToken } from '@reduxjs/toolkit/query';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import IAIDndImage from 'common/components/IAIDndImage';
import IAIDndImageIcon from 'common/components/IAIDndImageIcon';
import { setBoundingBoxDimensions } from 'features/canvas/store/canvasSlice';
import { heightChanged, widthChanged } from 'features/controlLayers/store/controlLayersSlice';
import type { ImageWithDims } from 'features/controlLayers/util/controlAdapters';
import type { ImageDraggableData, TypesafeDroppableData } from 'features/dnd/types';
import { calculateNewSize } from 'features/parameters/components/ImageSize/calculateNewSize';
import { selectOptimalDimension } from 'features/parameters/store/generationSlice';
import { activeTabNameSelector } from 'features/ui/store/uiSelectors';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PiArrowCounterClockwiseBold, PiRulerBold } from 'react-icons/pi';
import { useGetImageDTOQuery } from 'services/api/endpoints/images';
import type { ImageDTO, PostUploadAction } from 'services/api/types';

type Props = {
  image: ImageWithDims | null;
  onChangeImage: (imageDTO: ImageDTO | null) => void;
  droppableData: TypesafeDroppableData;
  postUploadAction: PostUploadAction;
};

export const InitialImagePreview = memo(({ image, onChangeImage, droppableData, postUploadAction }: Props) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isConnected = useAppSelector((s) => s.system.isConnected);
  const activeTabName = useAppSelector(activeTabNameSelector);
  const optimalDimension = useAppSelector(selectOptimalDimension);
  const shift = useShiftModifier();

  const { currentData: imageDTO, isError: isErrorControlImage } = useGetImageDTOQuery(image?.name ?? skipToken);

  const onReset = useCallback(() => {
    onChangeImage(null);
  }, [onChangeImage]);

  const onUseSize = useCallback(() => {
    if (!imageDTO) {
      return;
    }

    if (activeTabName === 'canvas') {
      dispatch(setBoundingBoxDimensions({ width: imageDTO.width, height: imageDTO.height }, optimalDimension));
    } else {
      const options = { updateAspectRatio: true, clamp: true };
      if (shift) {
        const { width, height } = imageDTO;
        dispatch(widthChanged({ width, ...options }));
        dispatch(heightChanged({ height, ...options }));
      } else {
        const { width, height } = calculateNewSize(
          imageDTO.width / imageDTO.height,
          optimalDimension * optimalDimension
        );
        dispatch(widthChanged({ width, ...options }));
        dispatch(heightChanged({ height, ...options }));
      }
    }
  }, [imageDTO, activeTabName, dispatch, optimalDimension, shift]);

  const draggableData = useMemo<ImageDraggableData | undefined>(() => {
    if (imageDTO) {
      return {
        id: 'initial_image_layer',
        payloadType: 'IMAGE_DTO',
        payload: { imageDTO: imageDTO },
      };
    }
  }, [imageDTO]);

  useEffect(() => {
    if (isConnected && isErrorControlImage) {
      onReset();
    }
  }, [onReset, isConnected, isErrorControlImage]);

  return (
    <Flex position="relative" w="full" h={36} alignItems="center" justifyContent="center">
      <IAIDndImage
        draggableData={draggableData}
        droppableData={droppableData}
        imageDTO={imageDTO}
        postUploadAction={postUploadAction}
      />

      <>
        <IAIDndImageIcon
          onClick={onReset}
          icon={imageDTO ? <PiArrowCounterClockwiseBold size={16} /> : undefined}
          tooltip={t('controlnet.resetControlImage')}
        />
        <IAIDndImageIcon
          onClick={onUseSize}
          icon={imageDTO ? <PiRulerBold size={16} /> : undefined}
          tooltip={shift ? t('controlnet.setControlImageDimensionsForce') : t('controlnet.setControlImageDimensions')}
          styleOverrides={useSizeStyleOverrides}
        />
      </>
    </Flex>
  );
});

InitialImagePreview.displayName = 'InitialImagePreview';

const useSizeStyleOverrides: SystemStyleObject = { mt: 6 };
