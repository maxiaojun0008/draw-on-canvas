export type Tool = 'select' | 'rect' | 'rrect' | 'polygon' | 'point';

export type Point2D = {
  x: number;
  y: number;
};

export type RectAnnotation = {
  id: string;
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
};

export type RotatedRectAnnotation = {
  id: string;
  type: 'rrect';
  cx: number;
  cy: number;
  w: number;
  h: number;
  angle: number;
  label?: string;
};

export type PolygonAnnotation = {
  id: string;
  type: 'polygon';
  points: Point2D[];
  label?: string;
};

export type PointAnnotation = {
  id: string;
  type: 'point';
  x: number;
  y: number;
  label?: string;
};

export type Annotation =
  | RectAnnotation
  | RotatedRectAnnotation
  | PolygonAnnotation
  | PointAnnotation;

export type ImageMeta = {
  width: number;
  height: number;
  name?: string;
};

export type AnnotationDocument = {
  version: string;
  imageMeta: ImageMeta;
  annotations: Annotation[];
};

export type EditorMode = 'idle' | 'drawing' | 'editing' | 'panning';

export type EditorState = {
  doc: AnnotationDocument;
  activeTool: Tool;
  selectedIds: string[];
  mode: EditorMode;
};

export type CoreVersion = {
  version: string;
};
