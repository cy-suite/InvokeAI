import { Flex } from '@invoke-ai/ui-library';
import { createSelector } from '@reduxjs/toolkit';
import { useAppSelector } from 'app/store/storeHooks';
import { selectControlLayersSlice } from 'features/controlLayers/store/controlLayersSlice';
import { ParamNegativePrompt } from 'features/parameters/components/Core/ParamNegativePrompt';
import { ParamPositivePrompt } from 'features/parameters/components/Core/ParamPositivePrompt';
import { selectGenerationSlice } from 'features/parameters/store/generationSlice';
import { ParamSDXLNegativeStylePrompt } from 'features/sdxl/components/SDXLPrompts/ParamSDXLNegativeStylePrompt';
import { ParamSDXLPositiveStylePrompt } from 'features/sdxl/components/SDXLPrompts/ParamSDXLPositiveStylePrompt';
import { memo } from 'react';

const concatPromptsSelector = createSelector(
  [selectGenerationSlice, selectControlLayersSlice],
  (generation, controlLayers) => {
    return generation.model?.base !== 'sdxl' || controlLayers.present.shouldConcatPrompts;
  }
);

export const Prompts = memo(() => {
  const shouldConcatPrompts = useAppSelector(concatPromptsSelector);
  return (
    <Flex flexDir="column" gap={2}>
      <ParamPositivePrompt />
      {!shouldConcatPrompts && <ParamSDXLPositiveStylePrompt />}
      <ParamNegativePrompt />
      {!shouldConcatPrompts && <ParamSDXLNegativeStylePrompt />}
    </Flex>
  );
});

Prompts.displayName = 'Prompts';
