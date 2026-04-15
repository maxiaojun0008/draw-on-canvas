import { describe, expect, it } from 'vitest';
import {
  CORE_VERSION,
  addAnnotationCommand,
  createEditorStore,
  deleteAnnotationCommand,
  updateAnnotationCommand
} from './index';

describe('core package', () => {
  it('exposes semantic version', () => {
    expect(CORE_VERSION.version).toBe('0.1.0');
  });

  it('supports add/update/delete with undo/redo', () => {
    const store = createEditorStore({
      version: '0.1.0',
      imageMeta: { width: 100, height: 100 },
      annotations: []
    });

    store.execute(
      addAnnotationCommand({
        id: 'a-1',
        type: 'rect',
        x: 10,
        y: 10,
        w: 20,
        h: 20
      })
    );

    store.execute(
      updateAnnotationCommand('a-1', (annotation) => {
        if (annotation.type !== 'rect') {
          return annotation;
        }

        return { ...annotation, w: 40 };
      })
    );

    expect(store.getState().doc.annotations).toHaveLength(1);
    expect(store.getState().doc.annotations[0]).toMatchObject({ w: 40 });

    store.execute(deleteAnnotationCommand('a-1'));
    expect(store.getState().doc.annotations).toHaveLength(0);

    store.undo();
    expect(store.getState().doc.annotations).toHaveLength(1);

    store.redo();
    expect(store.getState().doc.annotations).toHaveLength(0);
  });
});
