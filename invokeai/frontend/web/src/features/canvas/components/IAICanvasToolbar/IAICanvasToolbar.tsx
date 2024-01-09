import { Flex } from '@chakra-ui/react';
import { useStore } from '@nanostores/react';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { InvButtonGroup } from 'common/components/InvButtonGroup/InvButtonGroup';
import { InvControl } from 'common/components/InvControl/InvControl';
import { InvSelect } from 'common/components/InvSelect/InvSelect';
import type { InvSelectOnChange } from 'common/components/InvSelect/types';
import { InvTooltip } from 'common/components/InvTooltip/InvTooltip';
import { useCopyImageToClipboard } from 'common/hooks/useCopyImageToClipboard';
import { useImageUploadButton } from 'common/hooks/useImageUploadButton';
import { useSingleAndDoubleClick } from 'common/hooks/useSingleAndDoubleClick';
import {
  canvasCopiedToClipboard,
  canvasDownloadedAsImage,
  canvasMerged,
  canvasSavedToGallery,
} from 'features/canvas/store/actions';
import { $canvasBaseLayer, $tool } from 'features/canvas/store/canvasNanostore';
import { isStagingSelector } from 'features/canvas/store/canvasSelectors';
import {
  resetCanvas,
  resetCanvasView,
  setIsMaskEnabled,
  setLayer,
} from 'features/canvas/store/canvasSlice';
import type { CanvasLayer } from 'features/canvas/store/canvasTypes';
import { LAYER_NAMES_DICT } from 'features/canvas/store/canvasTypes';
import { InvIconButton } from 'index';
import { memo, useCallback, useMemo } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTranslation } from 'react-i18next';
import {
  PiCopyBold,
  PiCrosshairSimpleBold,
  PiDownloadSimpleBold,
  PiFloppyDiskBold,
  PiHandGrabbingBold,
  PiStackBold,
  PiTrashSimpleBold,
  PiUploadSimpleBold,
} from 'react-icons/pi';

import IAICanvasMaskOptions from './IAICanvasMaskOptions';
import IAICanvasRedoButton from './IAICanvasRedoButton';
import IAICanvasSettingsButtonPopover from './IAICanvasSettingsButtonPopover';
import IAICanvasToolChooserOptions from './IAICanvasToolChooserOptions';
import IAICanvasUndoButton from './IAICanvasUndoButton';

const IAICanvasToolbar = () => {
  const dispatch = useAppDispatch();
  const isMaskEnabled = useAppSelector((s) => s.canvas.isMaskEnabled);
  const layer = useAppSelector((s) => s.canvas.layer);
  const tool = useStore($tool);
  const isStaging = useAppSelector(isStagingSelector);
  const { t } = useTranslation();
  const { isClipboardAPIAvailable } = useCopyImageToClipboard();

  const { getUploadButtonProps, getUploadInputProps } = useImageUploadButton({
    postUploadAction: { type: 'SET_CANVAS_INITIAL_IMAGE' },
  });

  useHotkeys(
    ['v'],
    () => {
      handleSelectMoveTool();
    },
    {
      enabled: () => !isStaging,
      preventDefault: true,
    },
    []
  );

  useHotkeys(
    ['r'],
    () => {
      handleResetCanvasView();
    },
    {
      enabled: () => true,
      preventDefault: true,
    },
    []
  );

  useHotkeys(
    ['shift+m'],
    () => {
      handleMergeVisible();
    },
    {
      enabled: () => !isStaging,
      preventDefault: true,
    },
    []
  );

  useHotkeys(
    ['shift+s'],
    () => {
      handleSaveToGallery();
    },
    {
      enabled: () => !isStaging,
      preventDefault: true,
    },
    []
  );

  useHotkeys(
    ['meta+c', 'ctrl+c'],
    () => {
      handleCopyImageToClipboard();
    },
    {
      enabled: () => !isStaging && isClipboardAPIAvailable,
      preventDefault: true,
    },
    [isClipboardAPIAvailable]
  );

  useHotkeys(
    ['shift+d'],
    () => {
      handleDownloadAsImage();
    },
    {
      enabled: () => !isStaging,
      preventDefault: true,
    },
    []
  );

  const handleSelectMoveTool = useCallback(() => {
    $tool.set('move');
  }, []);

  const handleResetCanvasView = useCallback(
    (shouldScaleTo1 = false) => {
      const canvasBaseLayer = $canvasBaseLayer.get();
      if (!canvasBaseLayer) {
        return;
      }
      const clientRect = canvasBaseLayer.getClientRect({
        skipTransform: true,
      });
      dispatch(
        resetCanvasView({
          contentRect: clientRect,
          shouldScaleTo1,
        })
      );
    },
    [dispatch]
  );
  const onSingleClick = useCallback(() => {
    handleResetCanvasView(false);
  }, [handleResetCanvasView]);
  const onDoubleClick = useCallback(() => {
    handleResetCanvasView(true);
  }, [handleResetCanvasView]);

  const handleClickResetCanvasView = useSingleAndDoubleClick({
    onSingleClick,
    onDoubleClick,
  });

  const handleResetCanvas = useCallback(() => {
    dispatch(resetCanvas());
  }, [dispatch]);

  const handleMergeVisible = useCallback(() => {
    dispatch(canvasMerged());
  }, [dispatch]);

  const handleSaveToGallery = useCallback(() => {
    dispatch(canvasSavedToGallery());
  }, [dispatch]);

  const handleCopyImageToClipboard = useCallback(() => {
    if (!isClipboardAPIAvailable) {
      return;
    }
    dispatch(canvasCopiedToClipboard());
  }, [dispatch, isClipboardAPIAvailable]);

  const handleDownloadAsImage = useCallback(() => {
    dispatch(canvasDownloadedAsImage());
  }, [dispatch]);

  const handleChangeLayer = useCallback<InvSelectOnChange>(
    (v) => {
      if (!v) {
        return;
      }
      dispatch(setLayer(v.value as CanvasLayer));
      if (v.value === 'mask' && !isMaskEnabled) {
        dispatch(setIsMaskEnabled(true));
      }
    },
    [dispatch, isMaskEnabled]
  );

  const value = useMemo(
    () => LAYER_NAMES_DICT.filter((o) => o.value === layer)[0],
    [layer]
  );

  return (
    <Flex alignItems="center" gap={2} flexWrap="wrap">
      <InvTooltip label={`${t('unifiedCanvas.layer')} (Q)`}>
        <InvControl isDisabled={isStaging} w="5rem">
          <InvSelect
            value={value}
            options={LAYER_NAMES_DICT}
            onChange={handleChangeLayer}
          />
        </InvControl>
      </InvTooltip>

      <IAICanvasMaskOptions />
      <IAICanvasToolChooserOptions />

      <InvButtonGroup>
        <InvIconButton
          aria-label={`${t('unifiedCanvas.move')} (V)`}
          tooltip={`${t('unifiedCanvas.move')} (V)`}
          icon={<PiHandGrabbingBold />}
          isChecked={tool === 'move' || isStaging}
          onClick={handleSelectMoveTool}
        />
        <InvIconButton
          aria-label={`${t('unifiedCanvas.resetView')} (R)`}
          tooltip={`${t('unifiedCanvas.resetView')} (R)`}
          icon={<PiCrosshairSimpleBold />}
          onClick={handleClickResetCanvasView}
        />
      </InvButtonGroup>

      <InvButtonGroup>
        <InvIconButton
          aria-label={`${t('unifiedCanvas.mergeVisible')} (Shift+M)`}
          tooltip={`${t('unifiedCanvas.mergeVisible')} (Shift+M)`}
          icon={<PiStackBold />}
          onClick={handleMergeVisible}
          isDisabled={isStaging}
        />
        <InvIconButton
          aria-label={`${t('unifiedCanvas.saveToGallery')} (Shift+S)`}
          tooltip={`${t('unifiedCanvas.saveToGallery')} (Shift+S)`}
          icon={<PiFloppyDiskBold />}
          onClick={handleSaveToGallery}
          isDisabled={isStaging}
        />
        {isClipboardAPIAvailable && (
          <InvIconButton
            aria-label={`${t('unifiedCanvas.copyToClipboard')} (Cmd/Ctrl+C)`}
            tooltip={`${t('unifiedCanvas.copyToClipboard')} (Cmd/Ctrl+C)`}
            icon={<PiCopyBold />}
            onClick={handleCopyImageToClipboard}
            isDisabled={isStaging}
          />
        )}
        <InvIconButton
          aria-label={`${t('unifiedCanvas.downloadAsImage')} (Shift+D)`}
          tooltip={`${t('unifiedCanvas.downloadAsImage')} (Shift+D)`}
          icon={<PiDownloadSimpleBold />}
          onClick={handleDownloadAsImage}
          isDisabled={isStaging}
        />
      </InvButtonGroup>
      <InvButtonGroup>
        <IAICanvasUndoButton />
        <IAICanvasRedoButton />
      </InvButtonGroup>

      <InvButtonGroup>
        <InvIconButton
          aria-label={`${t('common.upload')}`}
          tooltip={`${t('common.upload')}`}
          icon={<PiUploadSimpleBold />}
          isDisabled={isStaging}
          {...getUploadButtonProps()}
        />
        <input {...getUploadInputProps()} />
        <InvIconButton
          aria-label={`${t('unifiedCanvas.clearCanvas')}`}
          tooltip={`${t('unifiedCanvas.clearCanvas')}`}
          icon={<PiTrashSimpleBold />}
          onClick={handleResetCanvas}
          colorScheme="error"
          isDisabled={isStaging}
        />
      </InvButtonGroup>
      <InvButtonGroup>
        <IAICanvasSettingsButtonPopover />
      </InvButtonGroup>
    </Flex>
  );
};

export default memo(IAICanvasToolbar);
