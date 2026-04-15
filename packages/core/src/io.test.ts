import { describe, expect, it } from 'vitest';
import {
  isAnnotationDocument,
  parseAnnotationDocument,
  serializeAnnotationDocument
} from './io';

describe('io', () => {
  const doc = {
    version: '0.1.0',
    imageMeta: { width: 200, height: 100 },
    annotations: [
      {
        id: 'rr-1',
        type: 'rrect' as const,
        cx: 50,
        cy: 50,
        w: 40,
        h: 20,
        angle: Math.PI / 6
      }
    ]
  };

  it('validates annotation document', () => {
    expect(isAnnotationDocument(doc)).toBe(true);
    expect(isAnnotationDocument({})).toBe(false);
  });

  it('parses valid annotation document and throws on invalid', () => {
    expect(parseAnnotationDocument(doc)).toEqual(doc);
    expect(() => parseAnnotationDocument({ bad: true })).toThrowError();
  });

  it('serializes rrect as polygon when enabled', () => {
    const serialized = serializeAnnotationDocument(doc, { rrectAsPolygon: true });
    expect(serialized.annotations[0]).toMatchObject({ type: 'polygon' });
  });
});
