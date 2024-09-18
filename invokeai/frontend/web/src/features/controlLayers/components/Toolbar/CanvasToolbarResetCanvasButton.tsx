import { IconButton } from '@invoke-ai/ui-library';
import { useAppDispatch } from 'app/store/storeHooks';
import { useCanvasManager } from 'features/controlLayers/contexts/CanvasManagerProviderGate';
import { canvasReset } from 'features/controlLayers/store/actions';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PiTrashBold } from 'react-icons/pi';

export const CanvasToolbarResetCanvasButton = memo(() => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const canvasManager = useCanvasManager();
  const onClick = useCallback(() => {
    dispatch(canvasReset());
    canvasManager.stage.fitLayersToStage();
  }, [canvasManager.stage, dispatch]);
  return (
    <IconButton
      aria-label={t('controlLayers.resetCanvas')}
      tooltip={t('controlLayers.resetCanvas')}
      onClick={onClick}
      colorScheme="error"
      icon={<PiTrashBold />}
      variant="ghost"
    />
  );
});

CanvasToolbarResetCanvasButton.displayName = 'CanvasToolbarResetCanvasButton';
