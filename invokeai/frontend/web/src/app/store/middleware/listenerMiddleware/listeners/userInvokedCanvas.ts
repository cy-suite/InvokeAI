import { startAppListening } from '..';
import { sessionCreated, sessionInvoked } from 'services/thunks/session';
import { buildCanvasGraphAndBlobs } from 'features/nodes/util/graphBuilders/buildCanvasGraph';
import { log } from 'app/logging/useLogger';
import { canvasGraphBuilt } from 'features/nodes/store/actions';
import { imageUploaded } from 'services/thunks/image';
import { v4 as uuidv4 } from 'uuid';
import { Graph } from 'services/api';
import {
  canvasSessionIdChanged,
  stagingAreaInitialized,
} from 'features/canvas/store/canvasSlice';
import { userInvoked } from 'app/store/actions';

const moduleLog = log.child({ namespace: 'invoke' });

export const addUserInvokedCanvasListener = () => {
  startAppListening({
    predicate: (action): action is ReturnType<typeof userInvoked> =>
      userInvoked.match(action) && action.payload === 'unifiedCanvas',
    effect: async (action, { getState, dispatch, take }) => {
      const state = getState();

      const data = await buildCanvasGraphAndBlobs(state);

      if (!data) {
        moduleLog.error('Problem building graph');
        return;
      }

      const {
        rangeNode,
        iterateNode,
        baseNode,
        edges,
        baseBlob,
        maskBlob,
        generationMode,
      } = data;

      const baseFilename = `${uuidv4()}.png`;
      const maskFilename = `${uuidv4()}.png`;

      dispatch(
        imageUploaded({
          imageType: 'intermediates',
          formData: {
            file: new File([baseBlob], baseFilename, { type: 'image/png' }),
          },
        })
      );

      if (baseNode.type === 'img2img' || baseNode.type === 'inpaint') {
        const [{ payload: basePayload }] = await take(
          (action): action is ReturnType<typeof imageUploaded.fulfilled> =>
            imageUploaded.fulfilled.match(action) &&
            action.meta.arg.formData.file.name === baseFilename
        );

        const { image_name: baseName, image_type: baseType } =
          basePayload.response;

        baseNode.image = {
          image_name: baseName,
          image_type: baseType,
        };
      }

      if (baseNode.type === 'inpaint') {
        dispatch(
          imageUploaded({
            imageType: 'intermediates',
            formData: {
              file: new File([maskBlob], maskFilename, { type: 'image/png' }),
            },
          })
        );

        const [{ payload: maskPayload }] = await take(
          (action): action is ReturnType<typeof imageUploaded.fulfilled> =>
            imageUploaded.fulfilled.match(action) &&
            action.meta.arg.formData.file.name === maskFilename
        );

        const { image_name: maskName, image_type: maskType } =
          maskPayload.response;

        baseNode.mask = {
          image_name: maskName,
          image_type: maskType,
        };
      }

      // Assemble!
      const nodes: Graph['nodes'] = {
        [rangeNode.id]: rangeNode,
        [iterateNode.id]: iterateNode,
        [baseNode.id]: baseNode,
      };

      const graph = { nodes, edges };

      dispatch(canvasGraphBuilt(graph));
      moduleLog({ data: graph }, 'Canvas graph built');

      dispatch(sessionCreated({ graph }));

      const [{ meta }] = await take(sessionInvoked.fulfilled.match);
      const { sessionId } = meta.arg;

      if (!state.canvas.layerState.stagingArea.boundingBox) {
        dispatch(
          stagingAreaInitialized({
            sessionId,
            boundingBox: {
              ...state.canvas.boundingBoxCoordinates,
              ...state.canvas.boundingBoxDimensions,
            },
          })
        );
      }

      dispatch(canvasSessionIdChanged(sessionId));
    },
  });
};
