import { describe, expect, it } from 'vitest';
import {
  getRotatedRectCorners,
  isPointInRect,
  isPointInRotatedRect,
  normalizeAngle,
  toImagePoint,
  toScreenPoint
} from './geometry';

describe('geometry', () => {
  it('converts between screen and image points', () => {
    const transform = { scale: 2, offsetX: 50, offsetY: 30 };
    const imagePoint = toImagePoint({ x: 90, y: 70 }, transform);

    expect(imagePoint).toEqual({ x: 20, y: 20 });
    expect(toScreenPoint(imagePoint, transform)).toEqual({ x: 90, y: 70 });
  });

  it('tests point in axis-aligned rect', () => {
    const rect = { id: 'r1', type: 'rect' as const, x: 10, y: 10, w: 20, h: 20 };
    expect(isPointInRect({ x: 15, y: 25 }, rect)).toBe(true);
    expect(isPointInRect({ x: 35, y: 25 }, rect)).toBe(false);
  });

  it('normalizes angles', () => {
    expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo(Math.PI * 1.5);
  });

  it('calculates rotated rect geometry', () => {
    const rrect = {
      id: 'rr1',
      type: 'rrect' as const,
      cx: 50,
      cy: 50,
      w: 20,
      h: 10,
      angle: Math.PI / 4
    };

    const corners = getRotatedRectCorners(rrect);
    expect(corners).toHaveLength(4);
    expect(isPointInRotatedRect({ x: 50, y: 50 }, rrect)).toBe(true);
    expect(isPointInRotatedRect({ x: 10, y: 10 }, rrect)).toBe(false);
  });
});
