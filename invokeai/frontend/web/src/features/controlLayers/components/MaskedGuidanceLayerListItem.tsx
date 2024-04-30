import { Badge, Flex, Spacer } from '@invoke-ai/ui-library';
import { createMemoizedSelector } from 'app/store/createMemoizedSelector';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { rgbColorToString } from 'features/canvas/util/colorToString';
import { LayerTitle } from 'features/controlLayers/components/LayerTitle';
import { RPLayerColorPicker } from 'features/controlLayers/components/RPLayerColorPicker';
import { RPLayerDeleteButton } from 'features/controlLayers/components/RPLayerDeleteButton';
import { RPLayerIPAdapterList } from 'features/controlLayers/components/RPLayerIPAdapterList';
import { RPLayerMenu } from 'features/controlLayers/components/RPLayerMenu';
import { RPLayerNegativePrompt } from 'features/controlLayers/components/RPLayerNegativePrompt';
import { RPLayerPositivePrompt } from 'features/controlLayers/components/RPLayerPositivePrompt';
import RPLayerSettingsPopover from 'features/controlLayers/components/RPLayerSettingsPopover';
import { RPLayerVisibilityToggle } from 'features/controlLayers/components/RPLayerVisibilityToggle';
import {
  isMaskedGuidanceLayer,
  layerSelected,
  selectControlLayersSlice,
} from 'features/controlLayers/store/controlLayersSlice';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { assert } from 'tsafe';

import { AddPromptButtons } from './AddPromptButtons';

type Props = {
  layerId: string;
};

export const MaskedGuidanceLayerListItem = memo(({ layerId }: Props) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selector = useMemo(
    () =>
      createMemoizedSelector(selectControlLayersSlice, (controlLayers) => {
        const layer = controlLayers.present.layers.find((l) => l.id === layerId);
        assert(isMaskedGuidanceLayer(layer), `Layer ${layerId} not found or not an RP layer`);
        return {
          color: rgbColorToString(layer.previewColor),
          hasPositivePrompt: layer.positivePrompt !== null,
          hasNegativePrompt: layer.negativePrompt !== null,
          hasIPAdapters: layer.ipAdapterIds.length > 0,
          isSelected: layerId === controlLayers.present.selectedLayerId,
          autoNegative: layer.autoNegative,
        };
      }),
    [layerId]
  );
  const { autoNegative, color, hasPositivePrompt, hasNegativePrompt, hasIPAdapters, isSelected } =
    useAppSelector(selector);
  const onClickCapture = useCallback(() => {
    // Must be capture so that the layer is selected before deleting/resetting/etc
    dispatch(layerSelected(layerId));
  }, [dispatch, layerId]);
  return (
    <Flex
      gap={2}
      onClickCapture={onClickCapture}
      bg={isSelected ? color : 'base.800'}
      px={2}
      borderRadius="base"
      py="1px"
    >
      <Flex flexDir="column" w="full" bg="base.850" p={3} gap={3} borderRadius="base">
        <Flex gap={3} alignItems="center" cursor="pointer">
          <RPLayerVisibilityToggle layerId={layerId} />
          <LayerTitle type="regional_guidance_layer" />
          <Spacer />
          {autoNegative === 'invert' && (
            <Badge color="base.300" bg="transparent" borderWidth={1}>
              {t('controlLayers.autoNegative')}
            </Badge>
          )}
          <RPLayerColorPicker layerId={layerId} />
          <RPLayerSettingsPopover layerId={layerId} />
          <RPLayerMenu layerId={layerId} />
          <RPLayerDeleteButton layerId={layerId} />
        </Flex>
        {!hasPositivePrompt && !hasNegativePrompt && !hasIPAdapters && <AddPromptButtons layerId={layerId} />}
        {hasPositivePrompt && <RPLayerPositivePrompt layerId={layerId} />}
        {hasNegativePrompt && <RPLayerNegativePrompt layerId={layerId} />}
        {hasIPAdapters && <RPLayerIPAdapterList layerId={layerId} />}
      </Flex>
    </Flex>
  );
});

MaskedGuidanceLayerListItem.displayName = 'MaskedGuidanceLayerListItem';
