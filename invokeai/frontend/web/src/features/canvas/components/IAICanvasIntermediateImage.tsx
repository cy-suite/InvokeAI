import {
  createLruSelector,
  createMemoizedSelector,
} from 'app/store/createMemoizedSelector';
import { stateSelector } from 'app/store/store';
import { useAppSelector } from 'app/store/storeHooks';
import { memo, useEffect, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';

const progressImageSelector = createLruSelector(
  [stateSelector],
  ({ system, canvas }) => {
    const { denoiseProgress } = system;
    const { batchIds } = canvas;

    return denoiseProgress && batchIds.includes(denoiseProgress.batch_id)
      ? denoiseProgress.progress_image
      : undefined;
  }
);

const boundingBoxSelector = createMemoizedSelector(
  [stateSelector],
  ({ canvas }) => canvas.layerState.stagingArea.boundingBox
);

const IAICanvasIntermediateImage = () => {
  const progressImage = useAppSelector(progressImageSelector);
  const boundingBox = useAppSelector(boundingBoxSelector);
  const [loadedImageElement, setLoadedImageElement] =
    useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!progressImage) {
      return;
    }

    const tempImage = new Image();

    tempImage.onload = () => {
      setLoadedImageElement(tempImage);
    };

    tempImage.src = progressImage.dataURL;
  }, [progressImage]);

  if (!(progressImage && boundingBox) || !loadedImageElement) {
    return null;
  }

  return (
    <KonvaImage
      x={boundingBox.x}
      y={boundingBox.y}
      width={boundingBox.width}
      height={boundingBox.height}
      image={loadedImageElement}
      listening={false}
    />
  );
};

export default memo(IAICanvasIntermediateImage);
