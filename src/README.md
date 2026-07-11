# Source structure

- **`config/`** — App and pipeline configuration (constants, defaults). Import via `./config` or `./config/constants`.
- **`dev/`** — Developer tooling: `usePipelineControls`, the leva control-panel hook that exposes every pipeline tunable live.
- **`pipeline/`** — Multi-pass render pipeline. Entry: `MultiPassPipeline` from `./pipeline`. Contains `passes/` (Intensity, Blur, Edge, Body, Diffuse, Specular, Paper, Compositor, DebugView) and `utils/` (fullscreen quad, shared pass hooks, scene clone helpers).
- **`shaders/`** — All GLSL `.vert` and `.frag` files used by the pipeline.
- **`components/`** — UI and scene content (e.g. `PipelineDiagram` — the clickable pipeline schematic — and `TorusKnotScene`). Import via `./components`.

To add a new pass: add a component under `pipeline/passes/` (use the hooks in `pipeline/utils/passHooks.js`), wire it in `pipeline/MultiPassPipeline.jsx`, and add any shaders under `shaders/`.
