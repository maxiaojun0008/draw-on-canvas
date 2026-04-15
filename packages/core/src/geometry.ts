import {
  Point2D,
  RectAnnotation,
  RotatedRectAnnotation
} from './types';

export type ViewportTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export const toImagePoint = (
  screenPoint: Point2D,
  transform: ViewportTransform
): Point2D => {
  return {
    x: (screenPoint.x - transform.offsetX) / transform.scale,
    y: (screenPoint.y - transform.offsetY) / transform.scale
  };
};

export const toScreenPoint = (
  imagePoint: Point2D,
  transform: ViewportTransform
): Point2D => {
  return {
    x: imagePoint.x * transform.scale + transform.offsetX,
    y: imagePoint.y * transform.scale + transform.offsetY
  };
};

export const isPointInRect = (point: Point2D, rect: RectAnnotation): boolean => {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  );
};

export const normalizeAngle = (angle: number): number => {
  const twoPi = Math.PI * 2;
  const wrapped = angle % twoPi;
  return wrapped < 0 ? wrapped + twoPi : wrapped;
};

export const rotatePoint = (
  point: Point2D,
  origin: Point2D,
  angle: number
): Point2D => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;

  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos
  };
};

export const getRotatedRectCorners = (rect: RotatedRectAnnotation): Point2D[] => {
  const halfW = rect.w / 2;
  const halfH = rect.h / 2;

  const localCorners: Point2D[] = [
    { x: rect.cx - halfW, y: rect.cy - halfH },
    { x: rect.cx + halfW, y: rect.cy - halfH },
    { x: rect.cx + halfW, y: rect.cy + halfH },
    { x: rect.cx - halfW, y: rect.cy + halfH }
  ];

  return localCorners.map((corner) =>
    rotatePoint(corner, { x: rect.cx, y: rect.cy }, rect.angle)
  );
};

export const toLocalRotatedRectPoint = (
  point: Point2D,
  rect: RotatedRectAnnotation
): Point2D => {
  return rotatePoint(point, { x: rect.cx, y: rect.cy }, -rect.angle);
};

export const isPointInRotatedRect = (
  point: Point2D,
  rect: RotatedRectAnnotation
): boolean => {
  const local = toLocalRotatedRectPoint(point, rect);
  const halfW = rect.w / 2;
  const halfH = rect.h / 2;

  return (
    local.x >= rect.cx - halfW &&
    local.x <= rect.cx + halfW &&
    local.y >= rect.cy - halfH &&
    local.y <= rect.cy + halfH
  );
};

export const getRectResizeHandles = (rect: RectAnnotation): Point2D[] => {
  const centerX = rect.x + rect.w / 2;
  const centerY = rect.y + rect.h / 2;

  return [
    { x: rect.x, y: rect.y },
    { x: centerX, y: rect.y },
    { x: rect.x + rect.w, y: rect.y },
    { x: rect.x + rect.w, y: centerY },
    { x: rect.x + rect.w, y: rect.y + rect.h },
    { x: centerX, y: rect.y + rect.h },
    { x: rect.x, y: rect.y + rect.h },
    { x: rect.x, y: centerY }
  ];
};

export const getRotatedRectControls = (rect: RotatedRectAnnotation) => {
  const corners = getRotatedRectCorners(rect);
  const topCenter = rotatePoint(
    { x: rect.cx, y: rect.cy - rect.h / 2 },
    { x: rect.cx, y: rect.cy },
    rect.angle
  );

  const rotationHandle = rotatePoint(
    { x: topCenter.x, y: topCenter.y - 24 },
    topCenter,
    rect.angle
  );

  return {
    corners,
    rotationHandle
  };
};
