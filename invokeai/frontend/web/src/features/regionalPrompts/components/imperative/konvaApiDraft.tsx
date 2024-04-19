import { chakra } from '@invoke-ai/ui-library';
import { useStore } from '@nanostores/react';
import { createMemoizedSelector } from 'app/store/createMemoizedSelector';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import {
  $cursorPosition,
  layerBboxChanged,
  layerTranslated,
  REGIONAL_PROMPT_LAYER_OBJECT_GROUP_NAME,
  selectRegionalPromptsSlice,
} from 'features/regionalPrompts/store/regionalPromptsSlice';
import Konva from 'konva';
import type { Node, NodeConfig } from 'konva/lib/Node';
import type { IRect } from 'konva/lib/types';
import { atom } from 'nanostores';
import { useCallback, useLayoutEffect } from 'react';

import { useMouseDown, useMouseEnter, useMouseLeave, useMouseMove, useMouseUp } from './mouseEventHooks';
import { renderBbox, renderBrushPreview, renderLayers } from './renderers';

export const $stage = atom<Konva.Stage | null>(null);

export const selectPromptLayerObjectGroup = (item: Node<NodeConfig>) =>
  item.name() !== REGIONAL_PROMPT_LAYER_OBJECT_GROUP_NAME;

const selectSelectedLayerColor = createMemoizedSelector(selectRegionalPromptsSlice, (regionalPrompts) => {
  return regionalPrompts.layers.find((l) => l.id === regionalPrompts.selectedLayer)?.color;
});

export const useStageRenderer = (container: HTMLDivElement | null) => {
  const dispatch = useAppDispatch();
  const width = useAppSelector((s) => s.generation.width);
  const height = useAppSelector((s) => s.generation.height);
  const state = useAppSelector((s) => s.regionalPrompts);
  const stage = useStore($stage);
  const onMouseDown = useMouseDown();
  const onMouseUp = useMouseUp();
  const onMouseMove = useMouseMove();
  const onMouseEnter = useMouseEnter();
  const onMouseLeave = useMouseLeave();
  const cursorPosition = useStore($cursorPosition);
  const selectedLayerColor = useAppSelector(selectSelectedLayerColor);

  const onLayerPosChanged = useCallback(
    (layerId: string, x: number, y: number) => {
      dispatch(layerTranslated({ layerId, x, y }));
    },
    [dispatch]
  );

  const onBboxChanged = useCallback(
    (layerId: string, bbox: IRect) => {
      dispatch(layerBboxChanged({ layerId, bbox }));
    },
    [dispatch]
  );

  useLayoutEffect(() => {
    console.log('Initializing stage');
    if (!container) {
      return;
    }
    $stage.set(
      new Konva.Stage({
        container,
      })
    );
    return () => {
      console.log('Cleaning up stage');
      $stage.get()?.destroy();
    };
  }, [container]);

  useLayoutEffect(() => {
    console.log('Adding stage listeners');
    if (!stage) {
      return;
    }
    stage.on('mousedown', onMouseDown);
    stage.on('mouseup', onMouseUp);
    stage.on('mousemove', onMouseMove);
    stage.on('mouseenter', onMouseEnter);
    stage.on('mouseleave', onMouseLeave);

    return () => {
      console.log('Cleaning up stage listeners');
      stage.off('mousedown', onMouseDown);
      stage.off('mouseup', onMouseUp);
      stage.off('mousemove', onMouseMove);
      stage.off('mouseenter', onMouseEnter);
      stage.off('mouseleave', onMouseLeave);
    };
  }, [stage, onMouseDown, onMouseUp, onMouseMove, onMouseEnter, onMouseLeave]);

  useLayoutEffect(() => {
    console.log('Updating stage dimensions');
    if (!stage) {
      return;
    }
    stage.width(width);
    stage.height(height);
  }, [stage, width, height]);

  useLayoutEffect(() => {
    if (!stage || !cursorPosition || !selectedLayerColor) {
      return;
    }
    renderBrushPreview(stage, state.tool, selectedLayerColor, cursorPosition, state.brushSize);
  }, [stage, state.tool, cursorPosition, state.brushSize, selectedLayerColor]);

  useLayoutEffect(() => {
    console.log('Rendering layers');
    if (!stage) {
      return;
    }
    renderLayers(stage, state.layers, state.selectedLayer, onLayerPosChanged);
  }, [onLayerPosChanged, stage, state.layers, state.selectedLayer]);

  useLayoutEffect(() => {
    console.log('Rendering bbox');
    if (!stage) {
      return;
    }
    renderBbox(stage, state.tool, state.selectedLayer, onBboxChanged);
  }, [dispatch, stage, state.tool, state.selectedLayer, onBboxChanged]);
};

const $container = atom<HTMLDivElement | null>(null);
const containerRef = (el: HTMLDivElement | null) => {
  $container.set(el);
};

export const StageComponent = () => {
  const container = useStore($container);
  useStageRenderer(container);
  return <chakra.div ref={containerRef} tabIndex={-1} borderWidth={1} borderRadius="base" h="min-content" />;
};
