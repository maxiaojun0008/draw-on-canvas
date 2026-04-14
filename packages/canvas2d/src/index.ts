import { CORE_VERSION } from '@draw-on-canvas/core';

export const createCanvas2DRenderer = () => {
  return {
    engine: 'canvas2d',
    core: CORE_VERSION.version
  };
};
