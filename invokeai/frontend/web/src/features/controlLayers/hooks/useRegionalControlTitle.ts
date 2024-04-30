import { createSelector } from '@reduxjs/toolkit';
import { useAppSelector } from 'app/store/storeHooks';
import { isMaskedGuidanceLayer, selectControlLayersSlice } from 'features/controlLayers/store/controlLayersSlice';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const selectValidLayerCount = createSelector(selectControlLayersSlice, (controlLayers) => {
  if (!controlLayers.present.isEnabled) {
    return 0;
  }
  const validLayers = controlLayers.present.layers
    .filter(isMaskedGuidanceLayer)
    .filter((l) => l.isEnabled)
    .filter((l) => {
      const hasTextPrompt = Boolean(l.positivePrompt || l.negativePrompt);
      const hasAtLeastOneImagePrompt = l.ipAdapterIds.length > 0;
      return hasTextPrompt || hasAtLeastOneImagePrompt;
    });

  return validLayers.length;
});

export const useRegionalControlTitle = () => {
  const { t } = useTranslation();
  const validLayerCount = useAppSelector(selectValidLayerCount);
  const title = useMemo(() => {
    const suffix = validLayerCount > 0 ? ` (${validLayerCount})` : '';
    return `${t('controlLayers.regionalControl')}${suffix}`;
  }, [t, validLayerCount]);
  return title;
};
