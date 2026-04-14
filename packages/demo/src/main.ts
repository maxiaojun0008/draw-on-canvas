import { createCanvas2DRenderer } from '@draw-on-canvas/canvas2d';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  const renderer = createCanvas2DRenderer();
  app.textContent = `Renderer: ${renderer.engine}, Core: ${renderer.core}`;
}
