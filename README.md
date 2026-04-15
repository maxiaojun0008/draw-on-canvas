# draw-on-canvas

A TypeScript monorepo for building an open-source canvas image annotation library.

## Workspace packages

- `@draw-on-canvas/core`: shared types, geometry, state store, commands, import/export validation.
- `@draw-on-canvas/canvas2d`: Canvas2D renderer package with selection, drag move, keyboard shortcuts.
- `@draw-on-canvas/demo`: local demo app powered by Vite.

## Roadmap status

- ✅ Milestone 0: workspace/tooling/CI bootstrap
- ✅ Milestone 1: core data model and state command system
- ✅ Milestone 2: geometry helpers (rect/rrect)
- ✅ Milestone 3: canvas rendering baseline
- ✅ Milestone 4: interaction loop + undo/redo + delete + drag move + multi-select + polygon vertex edit
- ✅ Milestone 5: JSON parse/validate and export transform (`rrect -> polygon`)
- ⏳ Remaining:
  - CI run verification in network-enabled environment

## Development

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
```
