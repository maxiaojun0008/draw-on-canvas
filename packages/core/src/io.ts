import { getRotatedRectCorners } from './geometry';
import {
  Annotation,
  AnnotationDocument,
  PointAnnotation,
  PolygonAnnotation,
  RectAnnotation,
  RotatedRectAnnotation
} from './types';

export type SerializeOptions = {
  rrectAsPolygon?: boolean;
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
};

const isPoint = (value: unknown): value is { x: number; y: number } => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const point = value as { x?: unknown; y?: unknown };
  return isFiniteNumber(point.x) && isFiniteNumber(point.y);
};

const isRect = (value: unknown): value is RectAnnotation => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const rect = value as Partial<RectAnnotation>;
  return (
    rect.type === 'rect' &&
    typeof rect.id === 'string' &&
    isFiniteNumber(rect.x) &&
    isFiniteNumber(rect.y) &&
    isFiniteNumber(rect.w) &&
    isFiniteNumber(rect.h)
  );
};

const isRotatedRect = (value: unknown): value is RotatedRectAnnotation => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const rrect = value as Partial<RotatedRectAnnotation>;
  return (
    rrect.type === 'rrect' &&
    typeof rrect.id === 'string' &&
    isFiniteNumber(rrect.cx) &&
    isFiniteNumber(rrect.cy) &&
    isFiniteNumber(rrect.w) &&
    isFiniteNumber(rrect.h) &&
    isFiniteNumber(rrect.angle)
  );
};

const isPointAnnotation = (value: unknown): value is PointAnnotation => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const point = value as Partial<PointAnnotation>;
  return (
    point.type === 'point' &&
    typeof point.id === 'string' &&
    isFiniteNumber(point.x) &&
    isFiniteNumber(point.y)
  );
};

const isPolygon = (value: unknown): value is PolygonAnnotation => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const polygon = value as Partial<PolygonAnnotation> & { points?: unknown };
  return (
    polygon.type === 'polygon' &&
    typeof polygon.id === 'string' &&
    Array.isArray(polygon.points) &&
    polygon.points.every((point) => isPoint(point))
  );
};

export const isAnnotation = (value: unknown): value is Annotation => {
  return isRect(value) || isRotatedRect(value) || isPointAnnotation(value) || isPolygon(value);
};

export const isAnnotationDocument = (value: unknown): value is AnnotationDocument => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const doc = value as {
    version?: unknown;
    imageMeta?: { width?: unknown; height?: unknown; name?: unknown };
    annotations?: unknown;
  };

  return (
    typeof doc.version === 'string' &&
    Boolean(doc.imageMeta) &&
    isFiniteNumber(doc.imageMeta?.width) &&
    isFiniteNumber(doc.imageMeta?.height) &&
    Array.isArray(doc.annotations) &&
    doc.annotations.every((annotation) => isAnnotation(annotation))
  );
};

export const parseAnnotationDocument = (value: unknown): AnnotationDocument => {
  if (isAnnotationDocument(value)) {
    return value;
  }

  throw new Error('Invalid annotation document.');
};

export const serializeAnnotationDocument = (
  doc: AnnotationDocument,
  options: SerializeOptions = {}
): AnnotationDocument => {
  if (!options.rrectAsPolygon) {
    return {
      ...doc,
      annotations: doc.annotations.map((annotation) => ({ ...annotation }))
    };
  }

  return {
    ...doc,
    annotations: doc.annotations.map((annotation) => {
      if (annotation.type !== 'rrect') {
        return { ...annotation };
      }

      const corners = getRotatedRectCorners(annotation);
      return {
        id: annotation.id,
        type: 'polygon',
        points: corners
      } satisfies PolygonAnnotation;
    })
  };
};
