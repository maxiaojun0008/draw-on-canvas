import {
  Annotation,
  AnnotationDocument,
  CORE_VERSION,
  Tool,
  addAnnotationCommand,
  createEditorStore,
  deleteAnnotationCommand,
  getRotatedRectControls,
  getRotatedRectCorners,
  isPointInRect,
  isPointInRotatedRect,
  toImagePoint,
  toLocalRotatedRectPoint,
  updateAnnotationCommand
} from '@draw-on-canvas/core';

export type CreateAnnotatorOptions = {
  image?: HTMLImageElement;
  initialDocument?: AnnotationDocument;
};

type ChangeHandler = (doc: AnnotationDocument) => void;

type Viewport = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

const createDefaultDocument = (canvas: HTMLCanvasElement): AnnotationDocument => ({
  version: '0.1.0',
  imageMeta: {
    width: canvas.width,
    height: canvas.height
  },
  annotations: []
});

const drawAnnotation = (
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  selected: boolean,
  viewport: Viewport
) => {
  ctx.save();
  ctx.lineWidth = selected ? 2 / viewport.scale : 1 / viewport.scale;
  ctx.strokeStyle = selected ? '#2563eb' : '#ef4444';
  ctx.fillStyle = selected ? 'rgba(37, 99, 235, 0.12)' : 'rgba(239, 68, 68, 0.12)';

  if (annotation.type === 'rect') {
    ctx.beginPath();
    ctx.rect(annotation.x, annotation.y, annotation.w, annotation.h);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (annotation.type === 'rrect') {
    const corners = getRotatedRectCorners(annotation);
    const [firstCorner, ...restCorners] = corners;
    if (!firstCorner) {
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(firstCorner.x, firstCorner.y);
    restCorners.forEach((corner) => ctx.lineTo(corner.x, corner.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (selected) {
      const controls = getRotatedRectControls(annotation);
      ctx.fillStyle = '#1d4ed8';
      controls.corners.forEach((corner) => {
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, 5 / viewport.scale, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.beginPath();
      ctx.arc(controls.rotationHandle.x, controls.rotationHandle.y, 5 / viewport.scale, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  if (annotation.type === 'polygon') {
    if (annotation.points.length < 2) {
      ctx.restore();
      return;
    }

    const [firstPoint, ...restPoints] = annotation.points;
    if (!firstPoint) {
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(firstPoint.x, firstPoint.y);
    restPoints.forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (selected) {
      ctx.fillStyle = '#1d4ed8';
      annotation.points.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4 / viewport.scale, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.arc(annotation.x, annotation.y, 4 / viewport.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

const hitTest = (annotations: Annotation[], x: number, y: number): string | null => {
  for (let i = annotations.length - 1; i >= 0; i -= 1) {
    const annotation = annotations[i];
    if (!annotation) {
      continue;
    }

    if (annotation.type === 'rect' && isPointInRect({ x, y }, annotation)) {
      return annotation.id;
    }

    if (annotation.type === 'rrect' && isPointInRotatedRect({ x, y }, annotation)) {
      return annotation.id;
    }

    if (annotation.type === 'point') {
      const distance = Math.hypot(annotation.x - x, annotation.y - y);
      if (distance <= 8) {
        return annotation.id;
      }
    }

    if (annotation.type === 'polygon') {
      const closeToVertex = annotation.points.some((point) => Math.hypot(point.x - x, point.y - y) <= 8);
      if (closeToVertex) {
        return annotation.id;
      }
    }
  }

  return null;
};

const translateAnnotation = (annotation: Annotation, dx: number, dy: number): Annotation => {
  if (annotation.type === 'rect') {
    return { ...annotation, x: annotation.x + dx, y: annotation.y + dy };
  }

  if (annotation.type === 'rrect') {
    return { ...annotation, cx: annotation.cx + dx, cy: annotation.cy + dy };
  }

  if (annotation.type === 'point') {
    return { ...annotation, x: annotation.x + dx, y: annotation.y + dy };
  }

  return {
    ...annotation,
    points: annotation.points.map((point) => ({ x: point.x + dx, y: point.y + dy }))
  };
};

const toggleId = (ids: string[], id: string): string[] => {
  return ids.includes(id) ? ids.filter((existingId) => existingId !== id) : [...ids, id];
};

export const createCanvas2DRenderer = (
  canvas: HTMLCanvasElement,
  options: CreateAnnotatorOptions = {}
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available.');
  }

  const store = createEditorStore(options.initialDocument ?? createDefaultDocument(canvas));
  const changeHandlers = new Set<ChangeHandler>();
  const viewport: Viewport = {
    scale: 1,
    offsetX: 0,
    offsetY: 0
  };

  let draggingIds: string[] = [];
  let draggingVertex: { annotationId: string; pointIndex: number } | null = null;
  let rrectEditing: { annotationId: string; mode: 'rotate' | 'resize' } | null = null;
  let lastPointer = { x: 0, y: 0 };
  let isPanning = false;
  let spacePressed = false;

  const getImagePointFromEvent = (event: MouseEvent | WheelEvent) => {
    const rect = canvas.getBoundingClientRect();
    const screenPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    return {
      screenPoint,
      imagePoint: toImagePoint(screenPoint, viewport)
    };
  };

  const findSelectedRRect = () => {
    const state = store.getState();
    if (state.selectedIds.length !== 1) {
      return null;
    }

    const selected = state.doc.annotations.find((annotation) => annotation.id === state.selectedIds[0]);
    if (!selected || selected.type !== 'rrect') {
      return null;
    }

    return selected;
  };

  const render = () => {
    const state = store.getState();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offsetX, viewport.offsetY);

    if (options.image) {
      ctx.drawImage(options.image, 0, 0, state.doc.imageMeta.width, state.doc.imageMeta.height);
    }

    state.doc.annotations.forEach((annotation) => {
      drawAnnotation(ctx, annotation, state.selectedIds.includes(annotation.id), viewport);
    });

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  const notifyChange = () => {
    const doc = store.getState().doc;
    changeHandlers.forEach((handler) => handler(doc));
  };

  const unsubscribe = store.subscribe(() => {
    render();
    notifyChange();
  });

  const onPointerDown = (event: MouseEvent) => {
    const { screenPoint, imagePoint } = getImagePointFromEvent(event);
    lastPointer = screenPoint;

    if (spacePressed || event.button === 1) {
      isPanning = true;
      return;
    }

    const state = store.getState();
    if (state.activeTool !== 'select') {
      return;
    }

    const selectedRRect = findSelectedRRect();
    if (selectedRRect) {
      const controls = getRotatedRectControls(selectedRRect);
      const rotationDistance = Math.hypot(
        controls.rotationHandle.x - imagePoint.x,
        controls.rotationHandle.y - imagePoint.y
      );
      if (rotationDistance <= 10 / viewport.scale) {
        rrectEditing = { annotationId: selectedRRect.id, mode: 'rotate' };
        return;
      }

      const hitCorner = controls.corners.some(
        (corner) => Math.hypot(corner.x - imagePoint.x, corner.y - imagePoint.y) <= 10 / viewport.scale
      );
      if (hitCorner) {
        rrectEditing = { annotationId: selectedRRect.id, mode: 'resize' };
        return;
      }
    }

    const selectedPolygons = state.doc.annotations.filter(
      (annotation) => annotation.type === 'polygon' && state.selectedIds.includes(annotation.id)
    );

    for (const polygon of selectedPolygons) {
      const pointIndex = polygon.points.findIndex(
        (point) => Math.hypot(point.x - imagePoint.x, point.y - imagePoint.y) <= 10 / viewport.scale
      );
      if (pointIndex >= 0) {
        draggingVertex = { annotationId: polygon.id, pointIndex };
        return;
      }
    }

    const id = hitTest(state.doc.annotations, imagePoint.x, imagePoint.y);

    if (!id) {
      if (!event.shiftKey) {
        store.setSelectedIds([]);
      }
      return;
    }

    const nextSelected = event.shiftKey ? toggleId(state.selectedIds, id) : [id];
    store.setSelectedIds(nextSelected);
    draggingIds = nextSelected;
  };

  const onPointerMove = (event: MouseEvent) => {
    const { screenPoint, imagePoint } = getImagePointFromEvent(event);

    if (isPanning) {
      const dx = screenPoint.x - lastPointer.x;
      const dy = screenPoint.y - lastPointer.y;
      viewport.offsetX += dx;
      viewport.offsetY += dy;
      lastPointer = screenPoint;
      render();
      return;
    }

    if (draggingVertex) {
      store.execute(
        updateAnnotationCommand(draggingVertex.annotationId, (annotation) => {
          if (annotation.type !== 'polygon') {
            return annotation;
          }

          return {
            ...annotation,
            points: annotation.points.map((point, index) => {
              if (index !== draggingVertex.pointIndex) {
                return point;
              }

              return { x: imagePoint.x, y: imagePoint.y };
            })
          };
        })
      );
      return;
    }

    if (rrectEditing) {
      store.execute(
        updateAnnotationCommand(rrectEditing.annotationId, (annotation) => {
          if (annotation.type !== 'rrect') {
            return annotation;
          }

          if (rrectEditing.mode === 'rotate') {
            const angle = Math.atan2(imagePoint.y - annotation.cy, imagePoint.x - annotation.cx) + Math.PI / 2;
            return {
              ...annotation,
              angle
            };
          }

          const local = toLocalRotatedRectPoint(imagePoint, annotation);
          const width = Math.max(Math.abs(local.x - annotation.cx) * 2, 8 / viewport.scale);
          const height = Math.max(Math.abs(local.y - annotation.cy) * 2, 8 / viewport.scale);
          return {
            ...annotation,
            w: width,
            h: height
          };
        })
      );
      return;
    }

    if (draggingIds.length === 0) {
      return;
    }

    const prevImage = toImagePoint(lastPointer, viewport);
    const dx = imagePoint.x - prevImage.x;
    const dy = imagePoint.y - prevImage.y;

    if (dx === 0 && dy === 0) {
      return;
    }

    draggingIds.forEach((id) => {
      store.execute(updateAnnotationCommand(id, (annotation) => translateAnnotation(annotation, dx, dy)));
    });

    lastPointer = screenPoint;
  };

  const onPointerUp = () => {
    draggingIds = [];
    draggingVertex = null;
    rrectEditing = null;
    isPanning = false;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code === 'Space') {
      spacePressed = true;
    }

    const state = store.getState();
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        store.redo();
      } else {
        store.undo();
      }
      return;
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedIds.length > 0) {
      event.preventDefault();
      state.selectedIds.forEach((id) => store.execute(deleteAnnotationCommand(id)));
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (event.code === 'Space') {
      spacePressed = false;
    }
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const { screenPoint, imagePoint } = getImagePointFromEvent(event);
    const factor = event.deltaY > 0 ? 0.95 : 1.05;
    const nextScale = Math.min(Math.max(viewport.scale * factor, 0.2), 5);

    viewport.offsetX = screenPoint.x - imagePoint.x * nextScale;
    viewport.offsetY = screenPoint.y - imagePoint.y * nextScale;
    viewport.scale = nextScale;
    render();
  };

  const onClick = (event: MouseEvent) => {
    const { imagePoint } = getImagePointFromEvent(event);
    const state = store.getState();

    if (state.activeTool === 'select') {
      return;
    }

    if (state.activeTool === 'rect') {
      store.execute(
        addAnnotationCommand({
          id: crypto.randomUUID(),
          type: 'rect',
          x: imagePoint.x - 40,
          y: imagePoint.y - 20,
          w: 80,
          h: 40
        })
      );
      return;
    }

    if (state.activeTool === 'rrect') {
      store.execute(
        addAnnotationCommand({
          id: crypto.randomUUID(),
          type: 'rrect',
          cx: imagePoint.x,
          cy: imagePoint.y,
          w: 90,
          h: 40,
          angle: Math.PI / 8
        })
      );
      return;
    }

    if (state.activeTool === 'point') {
      store.execute(
        addAnnotationCommand({
          id: crypto.randomUUID(),
          type: 'point',
          x: imagePoint.x,
          y: imagePoint.y
        })
      );
      return;
    }

    store.execute(
      addAnnotationCommand({
        id: crypto.randomUUID(),
        type: 'polygon',
        points: [
          { x: imagePoint.x, y: imagePoint.y - 20 },
          { x: imagePoint.x + 25, y: imagePoint.y + 20 },
          { x: imagePoint.x - 25, y: imagePoint.y + 20 }
        ]
      })
    );
  };

  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('click', onClick);
  render();

  return {
    engine: 'canvas2d',
    core: CORE_VERSION.version,
    setTool(tool: Tool) {
      store.setTool(tool);
    },
    getDocument() {
      return store.getState().doc;
    },
    import(doc: AnnotationDocument) {
      store.setDocument(doc);
    },
    export() {
      return store.getState().doc;
    },
    onChange(handler: ChangeHandler) {
      changeHandlers.add(handler);
      return () => changeHandlers.delete(handler);
    },
    updateAnnotation(id: string, updater: (annotation: Annotation) => Annotation) {
      store.execute(updateAnnotationCommand(id, updater));
    },
    deleteAnnotation(id: string) {
      store.execute(deleteAnnotationCommand(id));
    },
    undo() {
      store.undo();
    },
    redo() {
      store.redo();
    },
    resetView() {
      viewport.scale = 1;
      viewport.offsetX = 0;
      viewport.offsetY = 0;
      render();
    },
    destroy() {
      canvas.removeEventListener('mousedown', onPointerDown);
      canvas.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('click', onClick);
      unsubscribe();
      changeHandlers.clear();
    }
  };
};
