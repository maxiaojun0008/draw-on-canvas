import type { Tool } from '@draw-on-canvas/core';
import { createCanvas2DRenderer } from '@draw-on-canvas/canvas2d';

const canvas = document.querySelector<HTMLCanvasElement>('#canvas');
const toolbar = document.querySelector<HTMLDivElement>('#toolbar');
const jsonBox = document.querySelector<HTMLTextAreaElement>('#jsonBox');
const exportBtn = document.querySelector<HTMLButtonElement>('#exportBtn');
const importBtn = document.querySelector<HTMLButtonElement>('#importBtn');
const undoBtn = document.querySelector<HTMLButtonElement>('#undoBtn');
const redoBtn = document.querySelector<HTMLButtonElement>('#redoBtn');

if (!canvas || !toolbar || !jsonBox || !exportBtn || !importBtn || !undoBtn || !redoBtn) {
  throw new Error('Demo DOM initialization failed.');
}

const renderer = createCanvas2DRenderer(canvas);

const tools: Tool[] = ['select', 'rect', 'rrect', 'polygon', 'point'];

tools.forEach((tool) => {
  const btn = document.createElement('button');
  btn.textContent = tool;
  btn.addEventListener('click', () => renderer.setTool(tool));
  toolbar.appendChild(btn);
});

const syncJson = () => {
  jsonBox.value = JSON.stringify(renderer.export(), null, 2);
};

renderer.onChange(syncJson);
syncJson();

exportBtn.addEventListener('click', syncJson);

importBtn.addEventListener('click', () => {
  try {
    const doc = JSON.parse(jsonBox.value);
    renderer.import(doc);
  } catch {
    alert('JSON 格式错误');
  }
});

undoBtn.addEventListener('click', () => renderer.undo());
redoBtn.addEventListener('click', () => renderer.redo());
