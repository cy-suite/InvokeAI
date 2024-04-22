import { getStore } from 'app/store/nanostores/store';
import { rgbaColorToString, rgbColorToString } from 'features/canvas/util/colorToString';
import { getScaledFlooredCursorPosition } from 'features/regionalPrompts/hooks/mouseEventHooks';
import type { Layer, Tool, VectorMaskLayer } from 'features/regionalPrompts/store/regionalPromptsSlice';
import {
  $isMouseOver,
  $tool,
  getLayerBboxId,
  getVectorMaskLayerObjectGroupId,
  isVectorMaskLayer,
  LAYER_BBOX_NAME,
  TOOL_PREVIEW_BRUSH_BORDER_INNER_ID,
  TOOL_PREVIEW_BRUSH_BORDER_OUTER_ID,
  TOOL_PREVIEW_BRUSH_FILL_ID,
  TOOL_PREVIEW_BRUSH_GROUP_ID,
  TOOL_PREVIEW_LAYER_ID,
  TOOL_PREVIEW_RECT_ID,
  VECTOR_MASK_LAYER_LINE_NAME,
  VECTOR_MASK_LAYER_NAME,
  VECTOR_MASK_LAYER_OBJECT_GROUP_NAME,
  VECTOR_MASK_LAYER_RECT_NAME,
} from 'features/regionalPrompts/store/regionalPromptsSlice';
import { getLayerBboxFast, getLayerBboxPixels } from 'features/regionalPrompts/util/bbox';
import Konva from 'konva';
import type { IRect, Vector2d } from 'konva/lib/types';
import type { RgbColor } from 'react-colorful';
import { assert } from 'tsafe';
import { v4 as uuidv4 } from 'uuid';

const BBOX_SELECTED_STROKE = 'rgba(78, 190, 255, 1)';
const BBOX_NOT_SELECTED_STROKE = 'rgba(255, 255, 255, 0.353)';
const BBOX_NOT_SELECTED_MOUSEOVER_STROKE = 'rgba(255, 255, 255, 0.661)';
const BRUSH_BORDER_INNER_COLOR = 'rgba(0,0,0,1)';
const BRUSH_BORDER_OUTER_COLOR = 'rgba(255,255,255,0.8)';

const mapId = (object: { id: string }) => object.id;

const getIsSelected = (layerId?: string | null) => {
  if (!layerId) {
    return false;
  }
  return layerId === getStore().getState().regionalPrompts.present.selectedLayerId;
};

const selectVectorMaskObjects = (node: Konva.Node) => {
  return node.name() === VECTOR_MASK_LAYER_LINE_NAME || node.name() === VECTOR_MASK_LAYER_RECT_NAME;
};

/**
 * Renders the brush preview for the selected tool.
 * @param stage The konva stage to render on.
 * @param tool The selected tool.
 * @param color The selected layer's color.
 * @param cursorPos The cursor position.
 * @param lastMouseDownPos The position of the last mouse down event - used for the rect tool.
 * @param brushSize The brush size.
 */
export const renderToolPreview = (
  stage: Konva.Stage,
  tool: Tool,
  color: RgbColor | null,
  globalMaskLayerOpacity: number,
  cursorPos: Vector2d | null,
  lastMouseDownPos: Vector2d | null,
  brushSize: number
) => {
  const layerCount = stage.find(`.${VECTOR_MASK_LAYER_NAME}`).length;
  // Update the stage's pointer style
  if (layerCount === 0) {
    // We have no layers, so we should not render any tool
    stage.container().style.cursor = 'default';
  } else if (tool === 'move') {
    // Move tool gets a pointer
    stage.container().style.cursor = 'default';
  } else if (tool === 'rect') {
    // Move rect gets a crosshair
    stage.container().style.cursor = 'crosshair';
  } else {
    // Else we use the brush preview
    stage.container().style.cursor = 'none';
  }

  let toolPreviewLayer = stage.findOne<Konva.Layer>(`#${TOOL_PREVIEW_LAYER_ID}`);

  // Create the layer if it doesn't exist
  if (!toolPreviewLayer) {
    // Initialize the brush preview layer & add to the stage
    toolPreviewLayer = new Konva.Layer({ id: TOOL_PREVIEW_LAYER_ID, visible: tool !== 'move', listening: false });
    stage.add(toolPreviewLayer);

    // Add handlers to show/hide the brush preview layer
    stage.on('mousemove', (e) => {
      const tool = $tool.get();
      e.target
        .getStage()
        ?.findOne<Konva.Layer>(`#${TOOL_PREVIEW_LAYER_ID}`)
        ?.visible(tool === 'brush' || tool === 'eraser');
    });
    stage.on('mouseleave', (e) => {
      e.target.getStage()?.findOne<Konva.Layer>(`#${TOOL_PREVIEW_LAYER_ID}`)?.visible(false);
    });
    stage.on('mouseenter', (e) => {
      const tool = $tool.get();
      e.target
        .getStage()
        ?.findOne<Konva.Layer>(`#${TOOL_PREVIEW_LAYER_ID}`)
        ?.visible(tool === 'brush' || tool === 'eraser');
    });

    // Create the brush preview group & circles
    const brushPreviewGroup = new Konva.Group({ id: TOOL_PREVIEW_BRUSH_GROUP_ID });
    const brushPreviewFill = new Konva.Circle({
      id: TOOL_PREVIEW_BRUSH_FILL_ID,
      listening: false,
      strokeEnabled: false,
    });
    brushPreviewGroup.add(brushPreviewFill);
    const brushPreviewBorderInner = new Konva.Circle({
      id: TOOL_PREVIEW_BRUSH_BORDER_INNER_ID,
      listening: false,
      stroke: BRUSH_BORDER_INNER_COLOR,
      strokeWidth: 1,
      strokeEnabled: true,
    });
    brushPreviewGroup.add(brushPreviewBorderInner);
    const brushPreviewBorderOuter = new Konva.Circle({
      id: TOOL_PREVIEW_BRUSH_BORDER_OUTER_ID,
      listening: false,
      stroke: BRUSH_BORDER_OUTER_COLOR,
      strokeWidth: 1,
      strokeEnabled: true,
    });
    brushPreviewGroup.add(brushPreviewBorderOuter);
    toolPreviewLayer.add(brushPreviewGroup);

    // Create the rect preview
    const rectPreview = new Konva.Rect({ id: TOOL_PREVIEW_RECT_ID, listening: false, stroke: 'white', strokeWidth: 1 });
    toolPreviewLayer.add(rectPreview);
  }

  if (!$isMouseOver.get() || layerCount === 0) {
    // We can bail early if the mouse isn't over the stage or there are no layers
    toolPreviewLayer.visible(false);
    return;
  }

  toolPreviewLayer.visible(true);

  const brushPreviewGroup = stage.findOne<Konva.Group>(`#${TOOL_PREVIEW_BRUSH_GROUP_ID}`);
  assert(brushPreviewGroup, 'Brush preview group not found');

  const rectPreview = stage.findOne<Konva.Rect>(`#${TOOL_PREVIEW_RECT_ID}`);
  assert(rectPreview, 'Rect preview not found');

  // No need to render the brush preview if the cursor position or color is missing
  if (cursorPos && color && (tool === 'brush' || tool === 'eraser')) {
    // Update the fill circle
    const brushPreviewFill = brushPreviewGroup.findOne<Konva.Circle>(`#${TOOL_PREVIEW_BRUSH_FILL_ID}`);
    brushPreviewFill?.setAttrs({
      x: cursorPos.x,
      y: cursorPos.y,
      radius: brushSize / 2,
      fill: rgbaColorToString({ ...color, a: globalMaskLayerOpacity }),
      globalCompositeOperation: tool === 'brush' ? 'source-over' : 'destination-out',
    });

    // Update the inner border of the brush preview
    const brushPreviewInner = toolPreviewLayer.findOne<Konva.Circle>(`#${TOOL_PREVIEW_BRUSH_BORDER_INNER_ID}`);
    brushPreviewInner?.setAttrs({ x: cursorPos.x, y: cursorPos.y, radius: brushSize / 2 });

    // Update the outer border of the brush preview
    const brushPreviewOuter = toolPreviewLayer.findOne<Konva.Circle>(`#${TOOL_PREVIEW_BRUSH_BORDER_OUTER_ID}`);
    brushPreviewOuter?.setAttrs({
      x: cursorPos.x,
      y: cursorPos.y,
      radius: brushSize / 2 + 1,
    });

    brushPreviewGroup.visible(true);
  } else {
    brushPreviewGroup.visible(false);
  }

  if (cursorPos && lastMouseDownPos && tool === 'rect') {
    const rectPreview = toolPreviewLayer.findOne<Konva.Rect>(`#${TOOL_PREVIEW_RECT_ID}`);
    rectPreview?.setAttrs({
      x: Math.min(cursorPos.x, lastMouseDownPos.x),
      y: Math.min(cursorPos.y, lastMouseDownPos.y),
      width: Math.abs(cursorPos.x - lastMouseDownPos.x),
      height: Math.abs(cursorPos.y - lastMouseDownPos.y),
    });
    rectPreview?.visible(true);
  } else {
    rectPreview?.visible(false);
  }
};

const renderVectorMaskLayer = (
  stage: Konva.Stage,
  vmLayer: VectorMaskLayer,
  vmLayerIndex: number,
  globalMaskLayerOpacity: number,
  tool: Tool,
  onLayerPosChanged?: (layerId: string, x: number, y: number) => void
) => {
  let konvaLayer = stage.findOne<Konva.Layer>(`#${vmLayer.id}`);

  if (!konvaLayer) {
    // This layer hasn't been added to the konva state yet
    konvaLayer = new Konva.Layer({
      id: vmLayer.id,
      name: VECTOR_MASK_LAYER_NAME,
      draggable: true,
      dragDistance: 0,
    });

    // Create a `dragmove` listener for this layer
    if (onLayerPosChanged) {
      konvaLayer.on('dragend', function (e) {
        onLayerPosChanged(vmLayer.id, Math.floor(e.target.x()), Math.floor(e.target.y()));
      });
    }

    // The dragBoundFunc limits how far the layer can be dragged
    konvaLayer.dragBoundFunc(function (pos) {
      const cursorPos = getScaledFlooredCursorPosition(stage);
      if (!cursorPos) {
        return this.getAbsolutePosition();
      }
      // Prevent the user from dragging the layer out of the stage bounds.
      if (
        cursorPos.x < 0 ||
        cursorPos.x > stage.width() / stage.scaleX() ||
        cursorPos.y < 0 ||
        cursorPos.y > stage.height() / stage.scaleY()
      ) {
        return this.getAbsolutePosition();
      }
      return pos;
    });

    // The object group holds all of the layer's objects (e.g. lines and rects)
    const konvaObjectGroup = new Konva.Group({
      id: getVectorMaskLayerObjectGroupId(vmLayer.id, uuidv4()),
      name: VECTOR_MASK_LAYER_OBJECT_GROUP_NAME,
      listening: false,
    });
    konvaLayer.add(konvaObjectGroup);

    stage.add(konvaLayer);

    // When a layer is added, it ends up on top of the brush preview - we need to move the preview back to the top.
    stage.findOne<Konva.Layer>(`#${TOOL_PREVIEW_LAYER_ID}`)?.moveToTop();
  }

  // Update the layer's position and listening state
  konvaLayer.setAttrs({
    listening: tool === 'move', // The layer only listens when using the move tool - otherwise the stage is handling mouse events
    x: Math.floor(vmLayer.x),
    y: Math.floor(vmLayer.y),
    // We have a konva layer for each redux layer, plus a brush preview layer, which should always be on top. We can
    // therefore use the index of the redux layer as the zIndex for konva layers. If more layers are added to the
    // stage, this may no longer be work.
    zIndex: vmLayerIndex,
  });

  // Convert the color to a string, stripping the alpha - the object group will handle opacity.
  const rgbColor = rgbColorToString(vmLayer.previewColor);

  const konvaObjectGroup = konvaLayer.findOne<Konva.Group>(`.${VECTOR_MASK_LAYER_OBJECT_GROUP_NAME}`);
  assert(konvaObjectGroup, `Object group not found for layer ${vmLayer.id}`);

  // We use caching to handle "global" layer opacity, but caching is expensive and we should only do it when required.
  let groupNeedsCache = false;

  const objectIds = vmLayer.objects.map(mapId);
  for (const objectNode of konvaObjectGroup.find(selectVectorMaskObjects)) {
    if (!objectIds.includes(objectNode.id())) {
      objectNode.destroy();
      groupNeedsCache = true;
    }
  }

  for (const reduxObject of vmLayer.objects) {
    if (reduxObject.type === 'vector_mask_line') {
      let vectorMaskLine = stage.findOne<Konva.Line>(`#${reduxObject.id}`);

      // Create the line if it doesn't exist
      if (!vectorMaskLine) {
        vectorMaskLine = new Konva.Line({
          id: reduxObject.id,
          key: reduxObject.id,
          name: VECTOR_MASK_LAYER_LINE_NAME,
          strokeWidth: reduxObject.strokeWidth,
          tension: 0,
          lineCap: 'round',
          lineJoin: 'round',
          shadowForStrokeEnabled: false,
          globalCompositeOperation: reduxObject.tool === 'brush' ? 'source-over' : 'destination-out',
          listening: false,
        });
        konvaObjectGroup.add(vectorMaskLine);
      }

      // Only update the points if they have changed. The point values are never mutated, they are only added to the
      // array, so checking the length is sufficient to determine if we need to re-cache.
      if (vectorMaskLine.points().length !== reduxObject.points.length) {
        vectorMaskLine.points(reduxObject.points);
        groupNeedsCache = true;
      }
      // Only update the color if it has changed.
      if (vectorMaskLine.stroke() !== rgbColor) {
        vectorMaskLine.stroke(rgbColor);
        groupNeedsCache = true;
      }
    } else if (reduxObject.type === 'vector_mask_rect') {
      let konvaObject = stage.findOne<Konva.Rect>(`#${reduxObject.id}`);
      if (!konvaObject) {
        konvaObject = new Konva.Rect({
          id: reduxObject.id,
          key: reduxObject.id,
          name: VECTOR_MASK_LAYER_RECT_NAME,
          x: reduxObject.x,
          y: reduxObject.y,
          width: reduxObject.width,
          height: reduxObject.height,
          listening: false,
        });
        konvaObjectGroup.add(konvaObject);
      }
      // Only update the color if it has changed.
      if (konvaObject.fill() !== rgbColor) {
        konvaObject.fill(rgbColor);
        groupNeedsCache = true;
      }
    }
  }

  // Only update layer visibility if it has changed.
  if (konvaLayer.visible() !== vmLayer.isVisible) {
    konvaLayer.visible(vmLayer.isVisible);
    groupNeedsCache = true;
  }

  if (konvaObjectGroup.children.length > 0) {
    // If we have objects, we need to cache the group to apply the layer opacity...
    if (groupNeedsCache) {
      // ...but only if we've done something that needs the cache.
      konvaObjectGroup.cache();
    }
  } else {
    // No children - clear the cache to reset the previous pixel data
    konvaObjectGroup.clearCache();
  }

  // Updating group opacity does not require re-caching
  if (konvaObjectGroup.opacity() !== globalMaskLayerOpacity) {
    konvaObjectGroup.opacity(globalMaskLayerOpacity);
  }
};

/**
 * Renders the layers on the stage.
 * @param stage The konva stage to render on.
 * @param reduxLayers Array of the layers from the redux store.
 * @param layerOpacity The opacity of the layer.
 * @param onLayerPosChanged Callback for when the layer's position changes. This is optional to allow for offscreen rendering.
 * @returns
 */
export const renderLayers = (
  stage: Konva.Stage,
  reduxLayers: Layer[],
  globalMaskLayerOpacity: number,
  tool: Tool,
  onLayerPosChanged?: (layerId: string, x: number, y: number) => void
) => {
  const reduxLayerIds = reduxLayers.map(mapId);

  // Remove un-rendered layers
  for (const konvaLayer of stage.find<Konva.Layer>(`.${VECTOR_MASK_LAYER_NAME}`)) {
    if (!reduxLayerIds.includes(konvaLayer.id())) {
      konvaLayer.destroy();
    }
  }

  for (let layerIndex = 0; layerIndex < reduxLayers.length; layerIndex++) {
    const reduxLayer = reduxLayers[layerIndex];
    assert(reduxLayer, `Layer at index ${layerIndex} is undefined`);
    if (isVectorMaskLayer(reduxLayer)) {
      renderVectorMaskLayer(stage, reduxLayer, layerIndex, globalMaskLayerOpacity, tool, onLayerPosChanged);
    }
  }
};

/**
 *
 * @param stage The konva stage to render on.
 * @param tool The current tool.
 * @param selectedLayerIdId The currently selected layer id.
 * @param onBboxChanged A callback to be called when the bounding box changes.
 * @returns
 */
export const renderBbox = (
  stage: Konva.Stage,
  reduxLayers: Layer[],
  selectedLayerId: string | null,
  tool: Tool,
  onBboxChanged: (layerId: string, bbox: IRect | null) => void,
  onBboxMouseDown: (layerId: string) => void
) => {
  // Hide all bboxes so they don't interfere with getClientRect
  for (const bboxRect of stage.find<Konva.Rect>(`.${LAYER_BBOX_NAME}`)) {
    bboxRect.visible(false);
    bboxRect.listening(false);
  }
  // No selected layer or not using the move tool - nothing more to do here
  if (tool !== 'move') {
    return;
  }

  for (const reduxLayer of reduxLayers) {
    const konvaLayer = stage.findOne<Konva.Layer>(`#${reduxLayer.id}`);
    assert(konvaLayer, `Layer ${reduxLayer.id} not found in stage`);

    let bbox = reduxLayer.bbox;

    // We only need to recalculate the bbox if the layer has changed and it has objects
    if (reduxLayer.bboxNeedsUpdate && reduxLayer.objects.length) {
      // We only need to use the pixel-perfect bounding box if the layer has eraser strokes
      bbox = reduxLayer.needsPixelBbox ? getLayerBboxPixels(konvaLayer) : getLayerBboxFast(konvaLayer);

      // Update the layer's bbox in the redux store
      onBboxChanged(reduxLayer.id, bbox);
    }

    if (!bbox) {
      continue;
    }

    let rect = konvaLayer.findOne<Konva.Rect>(`.${LAYER_BBOX_NAME}`);
    if (!rect) {
      rect = new Konva.Rect({
        id: getLayerBboxId(reduxLayer.id),
        name: LAYER_BBOX_NAME,
        strokeWidth: 1,
      });
      rect.on('mousedown', function () {
        onBboxMouseDown(reduxLayer.id);
      });
      rect.on('mouseover', function (e) {
        if (getIsSelected(e.target.getLayer()?.id())) {
          this.stroke(BBOX_SELECTED_STROKE);
        } else {
          this.stroke(BBOX_NOT_SELECTED_MOUSEOVER_STROKE);
        }
      });
      rect.on('mouseout', function (e) {
        if (getIsSelected(e.target.getLayer()?.id())) {
          this.stroke(BBOX_SELECTED_STROKE);
        } else {
          this.stroke(BBOX_NOT_SELECTED_STROKE);
        }
      });
      konvaLayer.add(rect);
    }

    rect.setAttrs({
      visible: true,
      listening: true,
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
      stroke: reduxLayer.id === selectedLayerId ? BBOX_SELECTED_STROKE : BBOX_NOT_SELECTED_STROKE,
    });
  }
};
