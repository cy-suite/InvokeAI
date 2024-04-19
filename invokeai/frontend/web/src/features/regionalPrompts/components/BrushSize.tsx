import { CompositeNumberInput, CompositeSlider, FormControl, FormLabel } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { brushSizeChanged, initialRegionalPromptsState } from 'features/regionalPrompts/store/regionalPromptsSlice';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export const BrushSize = memo(() => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const brushSize = useAppSelector((s) => s.regionalPrompts.present.brushSize);
  const onChange = useCallback(
    (v: number) => {
      dispatch(brushSizeChanged(v));
    },
    [dispatch]
  );
  return (
    <FormControl>
      <FormLabel>{t('regionalPrompts.brushSize')}</FormLabel>
      <CompositeSlider
        min={1}
        max={300}
        defaultValue={initialRegionalPromptsState.brushSize}
        value={brushSize}
        onChange={onChange}
      />
      <CompositeNumberInput
        min={1}
        max={600}
        defaultValue={initialRegionalPromptsState.brushSize}
        value={brushSize}
        onChange={onChange}
      />
    </FormControl>
  );
});

BrushSize.displayName = 'BrushSize';
