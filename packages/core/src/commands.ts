import { Annotation, EditorState } from './types';

export interface EditorCommand {
  apply(state: EditorState): EditorState;
}

const replaceAnnotation = (
  annotations: Annotation[],
  id: string,
  updater: (annotation: Annotation) => Annotation
): Annotation[] => {
  return annotations.map((annotation) => {
    if (annotation.id !== id) {
      return annotation;
    }

    return updater(annotation);
  });
};

export const addAnnotationCommand = (annotation: Annotation): EditorCommand => ({
  apply(state) {
    return {
      ...state,
      doc: {
        ...state.doc,
        annotations: [...state.doc.annotations, annotation]
      },
      selectedIds: [annotation.id]
    };
  }
});

export const updateAnnotationCommand = (
  id: string,
  updater: (annotation: Annotation) => Annotation
): EditorCommand => ({
  apply(state) {
    return {
      ...state,
      doc: {
        ...state.doc,
        annotations: replaceAnnotation(state.doc.annotations, id, updater)
      }
    };
  }
});

export const deleteAnnotationCommand = (id: string): EditorCommand => ({
  apply(state) {
    return {
      ...state,
      doc: {
        ...state.doc,
        annotations: state.doc.annotations.filter((annotation) => annotation.id !== id)
      },
      selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id)
    };
  }
});
