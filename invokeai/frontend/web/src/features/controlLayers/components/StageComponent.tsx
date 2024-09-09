import { Flex } from '@invoke-ai/ui-library';
import { useStore } from '@nanostores/react';
import { $socket } from 'app/hooks/useSocketIO';
import { logger } from 'app/logging/logger';
import { useAppStore } from 'app/store/nanostores/store';
import { useAppSelector } from 'app/store/storeHooks';
import { CanvasHUD } from 'features/controlLayers/components/HUD/CanvasHUD';
import { CanvasSelectedEntityStatusAlert } from 'features/controlLayers/components/HUD/CanvasSelectedEntityStatusAlert';
import { CanvasManagerProviderGate } from 'features/controlLayers/contexts/CanvasManagerProviderGate';
import { CanvasManager } from 'features/controlLayers/konva/CanvasManager';
import { TRANSPARENCY_CHECKERBOARD_PATTERN_DATAURL } from 'features/controlLayers/konva/patterns/transparency-checkerboard-pattern';
import { getPrefixedId } from 'features/controlLayers/konva/util';
import { selectDynamicGrid, selectShowHUD } from 'features/controlLayers/store/canvasSettingsSlice';
import Konva from 'konva';
import { memo, useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useDevicePixelRatio } from 'use-device-pixel-ratio';

const log = logger('canvas');

// This will log warnings when layers > 5 - maybe use `import.meta.env.MODE === 'development'` instead?
Konva.showWarnings = false;

const useStageRenderer = (stage: Konva.Stage, container: HTMLDivElement | null) => {
  const store = useAppStore();
  const socket = useStore($socket);
  const dpr = useDevicePixelRatio({ round: false });

  useLayoutEffect(() => {
    log.debug('Initializing renderer');
    if (!container) {
      // Nothing to clean up
      log.debug('No stage container, skipping initialization');
      return () => {};
    }

    if (!socket) {
      log.debug('Socket not connected, skipping initialization');
      return () => {};
    }

    const manager = new CanvasManager(stage, container, store, socket);
    manager.initialize();
    return manager.destroy;
  }, [container, socket, stage, store]);

  useLayoutEffect(() => {
    Konva.pixelRatio = dpr;
  }, [dpr]);
};

export const StageComponent = memo(() => {
  const dynamicGrid = useAppSelector(selectDynamicGrid);
  const showHUD = useAppSelector(selectShowHUD);

  const [stage] = useState(
    () =>
      new Konva.Stage({
        id: getPrefixedId('konva_stage'),
        container: document.createElement('div'),
      })
  );
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const containerRef = useCallback((el: HTMLDivElement | null) => {
    setContainer(el);
  }, []);

  useStageRenderer(stage, container);

  useEffect(
    () => () => {
      stage.destroy();
    },
    [stage]
  );

  return (
    <Flex position="relative" w="full" h="full" bg={dynamicGrid ? 'base.850' : 'base.900'} borderRadius="base">
      {!dynamicGrid && (
        <Flex
          position="absolute"
          borderRadius="base"
          bgImage={TRANSPARENCY_CHECKERBOARD_PATTERN_DATAURL}
          top={0}
          right={0}
          bottom={0}
          left={0}
          opacity={0.1}
        />
      )}
      <Flex
        position="absolute"
        top={0}
        right={0}
        bottom={0}
        left={0}
        ref={containerRef}
        borderRadius="base"
        overflow="hidden"
        data-testid="control-layers-canvas"
      />
      <CanvasManagerProviderGate>
        {showHUD && (
          <Flex position="absolute" top={1} insetInlineStart={1} pointerEvents="none">
            <CanvasHUD />
          </Flex>
        )}
        <Flex position="absolute" top={1} insetInlineEnd={1} pointerEvents="none">
          <CanvasSelectedEntityStatusAlert />
        </Flex>
      </CanvasManagerProviderGate>
    </Flex>
  );
});

StageComponent.displayName = 'StageComponent';
