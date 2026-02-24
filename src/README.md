# Source structure

- **`config/`** — App and pipeline configuration (constants, defaults). Import via `./config` or `./config/constants`.
- **`pipeline/`** — Multi-pass render pipeline. Entry: `MultiPassPipeline` from `./pipeline`. Contains `passes/` (Intensity, FlowPattern, Blur, Diffuse, Specular, Compositor) and `utils/` (fullscreen quad, scene clone helpers).
- **`shaders/`** — All GLSL `.vert` and `.frag` files used by the pipeline.
- **`components/`** — UI and scene content (e.g. `SceneOverlay`, `TorusScene`). Import via `./components`.
- **`archived/`** — Reference implementations not used in the app (e.g. `IntensityPassUnlit`).

To add a new pass: add a component under `pipeline/passes/`, wire it in `pipeline/MultiPassPipeline.jsx`, and add any shaders under `shaders/`.
