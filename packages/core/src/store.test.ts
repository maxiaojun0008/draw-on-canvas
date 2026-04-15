import { describe, expect, it } from 'vitest';
import {
  addAnnotationCommand,
  createEditorStore,
  deleteAnnotationCommand,
  replaceDocumentCommand
} from './index';

describe('store advanced behaviors', () => {
  it('replaces document and supports undo/redo', () => {
    const store = createEditorStore({
      version: '0.1.0',
      imageMeta: { width: 100, height: 100 },
      annotations: []
    });

    store.execute(
      addAnnotationCommand({
        id: 'a1',
        type: 'point',
        x: 10,
        y: 12
      })
    );

    store.execute(
      replaceDocumentCommand({
        version: '0.1.0',
        imageMeta: { width: 300, height: 200 },
        annotations: [
          {
            id: 'r1',
            type: 'rect',
            x: 20,
            y: 30,
            w: 40,
            h: 50
          }
        ]
      })
    );

    expect(store.getState().doc.imageMeta.width).toBe(300);
    expect(store.getState().doc.annotations).toHaveLength(1);

    store.undo();
    expect(store.getState().doc.annotations).toHaveLength(1);
    expect(store.getState().doc.annotations[0]).toMatchObject({ id: 'a1' });

    store.redo();
    expect(store.getState().doc.annotations[0]).toMatchObject({ id: 'r1' });
  });

  it('supports setDocument with history', () => {
    const store = createEditorStore({
      version: '0.1.0',
      imageMeta: { width: 100, height: 100 },
      annotations: []
    });

    store.setDocument({
      version: '0.1.0',
      imageMeta: { width: 500, height: 400 },
      annotations: [
        {
          id: 'p1',
          type: 'polygon',
          points: [
            { x: 1, y: 1 },
            { x: 10, y: 10 },
            { x: 20, y: 1 }
          ]
        }
      ]
    });

    expect(store.getState().doc.imageMeta.width).toBe(500);

    store.undo();
    expect(store.getState().doc.imageMeta.width).toBe(100);

    store.redo();
    expect(store.getState().doc.annotations[0]).toMatchObject({ id: 'p1' });
  });

  it('deletes selected annotations and updates selection', () => {
    const store = createEditorStore({
      version: '0.1.0',
      imageMeta: { width: 100, height: 100 },
      annotations: [
        { id: 'p1', type: 'point', x: 1, y: 1 },
        { id: 'p2', type: 'point', x: 2, y: 2 }
      ]
    });

    store.setSelectedIds(['p1', 'p2']);
    store.execute(deleteAnnotationCommand('p1'));

    expect(store.getState().selectedIds).toEqual(['p2']);
    expect(store.getState().doc.annotations).toHaveLength(1);
  });
});
