import {
  Annotation,
  AnnotationDocument,
  CORE_VERSION,
  Tool,
  addAnnotationCommand,
  createEditorStore,
  deleteAnnotationCommand,
  getRotatedRectCorners,
  isPointInRect,
  isPointInRotatedRect,
  updateAnnotationCommand
} from '@draw-on-canvas/core';

export type CreateAnnotatorOptions = {
  image?: HTMLImageElement;
  initialDocument?: AnnotationDocument;
};

type ChangeHandler = (doc: AnnotationDocument) => void;

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
  selected: boolean
) => {
  ctx.save();
  ctx.lineWidth = selected ? 2 : 1;
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
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.arc(annotation.x, annotation.y, 4, 0, Math.PI * 2);
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
      if (distance <= 6) {
        return annotation.id;
      }
    }

    if (annotation.type === 'polygon') {
      const closeToVertex = annotation.points.some((point) => Math.hypot(point.x - x, point.y - y) <= 6);
      if (closeToVertex) {
        return annotation.id;
      }
    }
  }

  return null;
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

  const render = () => {
    const state = store.getState();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (options.image) {
      ctx.drawImage(options.image, 0, 0, canvas.width, canvas.height);
    }

    state.doc.annotations.forEach((annotation) => {
      drawAnnotation(ctx, annotation, state.selectedIds.includes(annotation.id));
    });
  };

  const notifyChange = () => {
    const doc = store.getState().doc;
    changeHandlers.forEach((handler) => handler(doc));
  };

  const unsubscribe = store.subscribe(() => {
    render();
    notifyChange();
  });

  const onClick = (event: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const state = store.getState();

    if (state.activeTool === 'select') {
      const id = hitTest(state.doc.annotations, x, y);
      store.setSelectedIds(id ? [id] : []);
      return;
    }

    if (state.activeTool === 'rect') {
      store.execute(
        addAnnotationCommand({
          id: crypto.randomUUID(),
          type: 'rect',
          x: x - 40,
          y: y - 20,
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
          cx: x,
          cy: y,
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
          x,
          y
        })
      );
      return;
    }

    store.execute(
      addAnnotationCommand({
        id: crypto.randomUUID(),
        type: 'polygon',
        points: [
          { x, y: y - 20 },
          { x: x + 25, y: y + 20 },
          { x: x - 25, y: y + 20 }
        ]
      })
    );
  };

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
    destroy() {
      canvas.removeEventListener('click', onClick);
      unsubscribe();
      changeHandlers.clear();
    }
  };
};
