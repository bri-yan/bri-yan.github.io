# AGENTS.md

Keep this contract accurate in the same change as every architectural, pass,
control, graph, asset, or workflow change. Do not describe planned code as if it
already exists.

## Commands

```bash
pnpm dev        # start the Vite dev server; GLSL changes hot-reload
pnpm build      # create a production build
pnpm preview    # preview the production build
pnpm lint       # run ESLint
```

## Project direction

The target is a real-time watercolor/NPR renderer and its pipeline is the
portfolio piece. `synthesis` is the deliberate clean baseline. The primary
research direction is `resources/Watercolor_Montesdeoca.pdf`; selectively port
ideas from `resources/Watercolor_Luft_Deussen.pdf`. `resources/`, `.claude/`,
and `.pnpm-store/` are ignored local state. Paper textures are research assets,
not runtime inputs. Do not edit/delete user-owned
`THESIS_CORE_WATERCOLOR_TECHNIQUES.md` unless asked.

## Current pipeline

```text
substrate

scene ──> color ──> output
   ├───> raw-depth ──> normalized-depth ──> sobel
   ├───> diffuse ──> color-override
   │                 └──> dilution
   └───> specular
```

| Priority | Stage | Result |
|---:|---|---|
| `0` | `SubstratePass` | Procedural paper in `fbos.substrate`; RGB = paper color, A = height. |
| `1` | `RawColorPass` | Original-material RGBA scene capture in `fbos.color`. |
| `2` | `RawDepthPass` | Independent capture in `fbos.rawDepth`; R = linear view distance, A = coverage. |
| `3` | `DiffusePass` | Scene capture of flat-to-Lambert response in RGB, with coverage alpha. |
| `3.1` | `ColorOverridePass`, `DilutionPass` | Parallel fullscreen transforms of `fbos.diffuse`. |
| `3.2` | `SpecularPass` | Independent thresholded Blinn–Phong highlight mask. |
| `4` | `NormalizedDepthPass` | Per-subject 0–1 visible depth in `fbos.normalizedDepth`. |
| `4.1` | `SobelPass` | Debug-only continuous edge magnitude in `fbos.sobel`. |
| `5` | `OutputPass` | Composites `fbos.color` over the configured background to screen. |
| `6` | `DebugPass` | Replaces output with the selected probe. |

Prioritized `useFrame` callbacks disable React Three Fiber's automatic render.
`MultiPassPipeline` mounts flat sibling passes that communicate by FBO refs in
priority order.

## Data and debug contract

- `color` empty pixels are transparent black; `raw-depth` and
  `normalized-depth` empty pixels have alpha zero. Checkerboards exist only in
  debug presentation, never in stored data; cells are fixed screen-space squares
  rather than UV-scaled tiles.
- `substrate` is opaque procedural cold-press paper tuned against a real paper
  photo. A is a clamped 0–1 height: a 3-octave gradient-noise fBm, slightly
  vertically elongated and laterally warped (the paper tooth), plus fine grain
  and a faint broad drift. It uses a sin-free hash for GPU stability and is
  evaluated in top-left-anchored CSS pixels divided by `scale`, so it stays
  fixed through camera moves, resizes, and browser zoom. RGB is the paper color
  lit softly from the upper left across the height's slope (plus a slight
  height tint), so the visible tooth is the stored height. Default color is the
  near-white `#f4f2ec`. Unlike coverage signals, its debug view
  never checkerboards; its Debug/Substrate toggle displays alpha as grayscale.
  It is debug-only and does not yet affect output.
- `raw-depth` is unnormalized linear camera-view distance in scene units. Its
  debug view maps camera near/far to grayscale, but downstream shaders must not
  treat that preview mapping as stored data.
- `diffuse` is a grayscale flat-to-Lambert response in RGB with geometric
  coverage in alpha. `color-override` maps that response from shadow to base
  pigment color; when disabled it applies the base pigment color under the
  Lambert response. `dilution`
  is a diffuse-driven coverage signal written identically to RGB and alpha.
  `specular` is an independent binary Blinn–Phong RGBA mask.
- FBOs are allocated at the canvas's active device-pixel ratio. Cross-target
  depth lookups use each fragment's projected screen UV rather than
  `gl_FragCoord`, so browser zoom and transient target-size changes cannot
  misalign color/depth samples.
- `normalized-depth` derives each subject range on the CPU from all eight corners
  of every mesh's transformed local bounding box in camera view space. This is
  stable and inexpensive but approximate: visible mesh pixels need not reach
  exactly 0 or 1. Its final image remains visibility-tested against `raw-depth`,
  so hidden pixels are absent.
- `sobel` combines private horizontal and vertical normalized-depth gradients
  into continuous grayscale edge magnitude. It keeps normalized-depth coverage
  in alpha, so absent pixels remain checkerboard in debug; it does not affect output.
- Register a mesh/group for normalization with `useWatercolorSubject(ref, id)`.
  Each subject's mesh bounds are evaluated once per rendered frame.
- Scene-capture passes save and restore the renderer's active target and clear
  color state, so they remain isolated as the pipeline gains new stages.

`PIPELINE_STAGES` in `src/config/constants.js` is the source of truth for graph
nodes, edges, and debug views. `scene` maps to the `color` probe, so both nodes
highlight together. The graph's upper lane is `scene → color → output`; its
lower lane is `scene → raw-depth → normalized-depth → sobel`. Update metadata, mounts,
debug sources, controls, and docs together when changing passes.

The Leva panel exposes only live controls: output background; a Lighting folder
with Diffuse, Color Override, Specular, and Dilution subfolders; and Debug view.
The Sobel section exposes edge strength and an integer source-pixel radius.
The Substrate section exposes paper color and scale; Debug/Substrate exposes its
height preview while probing substrate.
`show bounding boxes` appears while probing normalized depth, and RGB/alpha
channels only while inspecting color.
`DebugPass` draws bounds after the FBO probe without changing it. Escape,
click-out, and re-click return the debug view to `output`.

## Source layout

- `src/pipeline/passes/RawColorPass.jsx`: independent color scene capture.
- `src/pipeline/passes/SubstratePass.jsx`: procedural paper source capture.
- `src/pipeline/passes/RawDepthPass.jsx`: independent floating-point depth capture.
- `src/pipeline/passes/DiffusePass.jsx`, `SpecularPass.jsx`: geometry lighting captures.
- `src/pipeline/passes/ColorOverridePass.jsx`, `DilutionPass.jsx`: diffuse-derived image passes.
- `src/pipeline/passes/NormalizedDepthPass.jsx`: transformed-bounds ranges and normalized image.
- `src/pipeline/passes/SobelPass.jsx`: normalized-depth Sobel edge composite.
- `src/pipeline/WatercolorSubjects.jsx`: registration context and hook.
- `src/shaders/`: capture, substrate, normalized-depth, output, and debug shaders.
- `src/components/PipelineDiagram.jsx`: graph derived from `PIPELINE_STAGES`.
- `EXPLAINER.md`: implemented behavior overview.

## Adding the next pass

1. Add the pass/shader and explicit frame priority.
2. Update `PIPELINE_STAGES`, FBO wiring, debug source, and only live controls.
3. Preserve the neutral empty-pixel/coverage convention and keep new signals
   debug-only until their output blend is explicitly designed.
4. Update this file and `EXPLAINER.md`.
5. Run lint/build and visually inspect output plus every debug view.
