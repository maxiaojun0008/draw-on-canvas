import { describe, expect, it } from 'vitest';
import { CORE_VERSION } from './index';

describe('core package', () => {
  it('exposes semantic version', () => {
    expect(CORE_VERSION.version).toBe('0.1.0');
  });
});
