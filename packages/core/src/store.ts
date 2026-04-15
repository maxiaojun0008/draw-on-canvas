import { EditorCommand } from './commands';
import { AnnotationDocument, EditorMode, EditorState, Tool } from './types';

type Subscriber = (state: EditorState) => void;

const cloneState = (state: EditorState): EditorState => {
  return {
    ...state,
    selectedIds: [...state.selectedIds],
    doc: {
      ...state.doc,
      imageMeta: { ...state.doc.imageMeta },
      annotations: state.doc.annotations.map((annotation) => {
        if (annotation.type === 'polygon') {
          return {
            ...annotation,
            points: annotation.points.map((point) => ({ ...point }))
          };
        }

        return { ...annotation };
      })
    }
  };
};

export interface EditorStore {
  getState(): EditorState;
  subscribe(subscriber: Subscriber): () => void;
  setDocument(doc: AnnotationDocument): void;
  setTool(tool: Tool): void;
  setMode(mode: EditorMode): void;
  setSelectedIds(ids: string[]): void;
  execute(command: EditorCommand): EditorState;
  undo(): EditorState;
  redo(): EditorState;
}

const createInitialState = (doc: AnnotationDocument): EditorState => ({
  doc,
  activeTool: 'select',
  selectedIds: [],
  mode: 'idle'
});

export const createEditorStore = (doc: AnnotationDocument): EditorStore => {
  let state = createInitialState(doc);
  const subscribers = new Set<Subscriber>();
  const undoStack: EditorState[] = [];
  const redoStack: EditorState[] = [];

  const emit = () => {
    subscribers.forEach((subscriber) => subscriber(state));
  };

  const pushUndo = () => {
    undoStack.push(cloneState(state));
    redoStack.length = 0;
  };

  return {
    getState() {
      return cloneState(state);
    },
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
    setDocument(doc) {
      pushUndo();
      state = {
        ...state,
        doc,
        selectedIds: []
      };
      emit();
    },
    setTool(tool) {
      state = { ...state, activeTool: tool };
      emit();
    },
    setMode(mode) {
      state = { ...state, mode };
      emit();
    },
    setSelectedIds(ids) {
      state = { ...state, selectedIds: [...ids] };
      emit();
    },
    execute(command) {
      pushUndo();
      state = command.apply(state);
      emit();
      return cloneState(state);
    },
    undo() {
      const previous = undoStack.pop();
      if (!previous) {
        return cloneState(state);
      }

      redoStack.push(cloneState(state));
      state = previous;
      emit();
      return cloneState(state);
    },
    redo() {
      const next = redoStack.pop();
      if (!next) {
        return cloneState(state);
      }

      undoStack.push(cloneState(state));
      state = next;
      emit();
      return cloneState(state);
    }
  };
};
