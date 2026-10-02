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
                                              scene
                 ┌──────────────────────┬───────┴─────────┬─────────────┐
              diffuse              turbulence           depth       specular
         ┌───────┴─────────┐            │                 │             │
  color-override       dilution         │               sobel           │
         └───────┬─────────┴────────────┘                 │             │
        diffuse-composition                          sobel-blur         │         substrate
                 │                                        │             │             │
     diffuse-composition-blur                             │             │             │
                 └───────────────────┬────────────────────┘             │             │
                              edge-darkening                            │             │
                                     └──────────────────────┬───────────┴─────────────┘
                                                         output
```

| Priority | Stage | Result |
|---:|---|---|
| `0` | `SubstratePass` | Procedural paper in HalfFloat `fbos.substrate`; RGB = paper color, A = height. |
| `1` | `ScenePass` | Original-material RGBA scene capture in `fbos.scene` (the `scene` probe); renders only while that view is selected. |
| `2` | `DepthPass` | Per-subject 0–1 visible depth in HalfFloat `fbos.depth`, A = coverage (depth pre-pass + LessEqual subject renders). |
| `3` | `DiffusePass` | Scene capture of flat-to-Lambert response in RGB, with coverage alpha. |
| `3.05` | `TurbulencePass` | Object-space Perlin fBm in HalfFloat `fbos.turbulence`; RGB = signed pigment density offset, A = coverage. |
| `3.1` | `ColorOverridePass`, `DilutionPass` | Parallel fullscreen transforms of `fbos.diffuse`. |
| `3.15` | `DiffuseCompositionPass` | Join in `fbos.diffuseComposition`; RGB = color-override pigment, A = dilution density, both mottled by turbulence. |
| `3.2` | `SpecularPass` | Independent thresholded Blinn–Phong highlight mask. |
| `4.1` | `SobelPass` | Continuous edge magnitude in `fbos.sobel`. |
| `4.2` | `BlurPass` ×2 | Gaussian blurs of `fbos.sobel` → `fbos.sobelBlur` and `fbos.diffuseComposition` → `fbos.diffuseCompositionBlur`. |
| `4.25` | `EdgeDarkeningPass` | Paint layer in `fbos.edgeDarkening`: diffuse blur concentrated along `fbos.sobelBlur` edges. |
| `5` | `OutputPass` | The finished painting, drawn to screen: edge-darkened paint, highlights lifted, on paper with toggleable substrate distortion and lighting (paper slope computed inline). |
| `6` | `DebugPass` | Replaces output with the selected probe. |

Prioritized `useFrame` callbacks disable React Three Fiber's automatic render.
`MultiPassPipeline` mounts flat sibling passes that communicate by FBO refs in
priority order.

## Data and debug contract

- `scene` empty pixels are transparent black; `depth` empty pixels have alpha
  zero. Checkerboards exist only in
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
  near-white `#f7f1ec`. Unlike coverage signals, its debug view
  never checkerboards; the Substrate `height map` toggle displays alpha as
  grayscale. Its target is HalfFloat so 1-texel height differences are smooth.
  `output` reads it directly: the paper slope ∇h comes from central
  differences of its alpha, as height change per paper unit (× DPR × scale,
  so it's O(1) and independent of zoom and `scale`), pointing uphill with x
  right and y screen-down. There is no separate gradient target.
- `edge-darkening` follows Montesdeoca §5.2.1: `Ed = k · Eb`, where `Eb` is
  `sobel-blur`'s un-premultiplied edge (the premultiplied blur keeps the rim
  from being diluted by empty background; its width is the thesis's `W`), and
  the paint concentrates as **the same hue, darker and richer**
  (`concentratePigment` in `src/shaders/chunks/oklab.glsl`, shared with pigment
  turbulence and prepended to each fragment source by its pass). In OKLab
  (after decoding the display-encoded RGB to linear), lightness is scaled by
  `1 − 0.3·t` and chroma (a, b) by `1 + 0.35·t`, with `t = 1 − e^(−Ed)`, so
  rims deepen smoothly and never reach black. Out-of-gamut results keep
  lightness and hue and back chroma off (8-step bisection) rather than
  clamping channels, which would reintroduce the hue drift. This replaces the thesis's
  per-channel `C^(1+Ed)`, which cannot darken channels at 1.0 and drifts every
  rim toward the strongest channel (both default pigments have blue = 1, so
  all rims turned the same electric blue); a plain lightness scale was also
  tried and read muddy. Density still concentrates by the thesis power,
  `a' = 1 − (1 − a)^(1+Ed)` (the paper's show-through), so diluted rims gain
  pigment; the layer contract (RGB pigment, A density) is kept for later
  effects. `k = 0` is an exact passthrough. Per-object painted width/intensity is out of
  scope.
- `output` is the finished painting, drawn straight to screen. It follows
  Montesdeoca §5.3 in thesis order over `edge-darkening`: **distortion** samples the paint at
  `uv + amount · ∇h` (CSS px; sampling uphill slides pigment into valleys),
  then **specular highlights** lift pigment (`a *= 1 − specular.a`, sampled at
  the same distorted UV) so they are left as bare paper, which keeps its tooth
  and is lit like the rest; then the paint is laid over the flat substrate
  **color uniform** by density
  (not the substrate RGB, whose baked relief would be lit twice), then
  **lighting** multiplies by `Id = 1 − ds·(1 − max(L·N, 0))` with
  `N = normalize(−r·∇h, 1)` rebuilt from the inline slope (no separate normal
  target) and `L` from a screen-space light angle. Each effect has its own
  toggle (Substrate › Distortion and Lighting); both off is plain edge-darkened paint on
  flat paper. It is opaque; the paper color is the background, so there is no
  separate background control. Depth-aware distortion (§5.3.1's front-object
  test) is deferred.
- `diffuse` is a grayscale flat-to-Lambert response in RGB with geometric
  coverage in alpha. `color-override` maps that response from shadow to base
  pigment color; when disabled it applies the base pigment color under the
  Lambert response. `dilution`
  is a diffuse-driven coverage signal written identically to RGB and alpha.
  `diffuse-composition` joins them into one watercolor layer: RGB is the
  color-override pigment and A is dilution density (already coverage-masked),
  composited over paper as `mix(paper, rgb, a)` in `output`. It then
  applies **pigment turbulence** (Montesdeoca §5.1.1, Eq. 5.1) with
  `df = intensity · turbulence`: `df > 0` concentrates (`concentratePigment`
  by `df`, and `a' = 1 − (1 − a)^(1+df)`), `df < 0` thins the wash toward the
  paper (`a *= 1 + df`; the thesis's fade to `Cs`, since paper is composited
  later). Intensity 0 is an exact passthrough. Its debug view blends pigment
  over the checkerboard by density.
- `turbulence` is a scene capture of **3D Perlin gradient-noise fBm evaluated
  at each surface's object-local position**, so the pattern rides with the
  mesh under any camera or object motion (no shower-door) and has no
  per-frame randomness. Perlin: 8 cube corners with Hoskins-hashed gradients,
  quintic fade. fBm: `octaves` (1–6; `MAX_OCTAVES` in the shader is kept in
  sync with `TURBULENCE_MAX_OCTAVES`), lacunarity ≈ 2, gain 0.5, each octave
  rotated by a fixed orthonormal matrix and offset to hide grid alignment, and
  normalized by total amplitude so octaves add detail, not contrast. An
  optional domain `warp` (default 0) reads the fBm where a 3-fBm flow carries
  the point. Stored signed in HalfFloat RGB (same value in each channel) as
  `clamp(2 · fbm, −1, 1)`, A = coverage; its signed debug view reads gray = 0,
  light = more pigment, and checkerboards where A = 0. Per-subject seeds and
  a constant screen-space feature size are deferred.
  `specular` is a binary Blinn–Phong RGBA mask; `output` uses its alpha
  to leave highlights unpainted.
- FBOs are allocated at the canvas's active device-pixel ratio, so every
  target shares one pixel grid and fullscreen passes sample them at `vUv`;
  depth visibility is resolved by the depth buffer, not a cross-target lookup.
- `depth` is per-subject normalized view depth (R, 0 = nearest bound, 1 =
  farthest) with coverage in A. Each subject's range comes from the CPU: all
  eight corners of every mesh's transformed local bounding box in camera view
  space. This is stable and inexpensive but approximate: visible mesh pixels
  need not reach exactly 0 or 1. Visibility is a **depth pre-pass**: the
  whole scene renders depth-only, then each subject renders its normalized
  depth with `LessEqual` testing and no depth writes (`gl.autoClear` is off
  between the two so the pre-pass survives). Both use `depthVertex.vert`, so
  depths match exactly and anything in front of a subject hides it; there is
  no raw-depth target or tolerance comparison. It needs WebGL2 with
  `EXT_color_buffer_float`.
- `sobel` combines private horizontal and vertical depth gradients into
  continuous grayscale edge magnitude. It keeps depth coverage
  in alpha, so absent pixels remain checkerboard in debug; it reaches output
  through `sobel-blur` and `edge-darkening`.
- `BlurPass` is a reusable separable Gaussian blur of any RGBA pass (`inputRef`,
  `outputRef`, `radius`). `radius` is in CSS pixels (≈3σ, scaled by device
  pixel ratio so zoom doesn't change it); 0 passes the input through. Taps stay
  ≤1 texel apart up to 32 per side, then spread evenly. Color is blurred
  premultiplied by alpha and un-premultiplied on the final write, so alpha
  keeps its meaning (coverage/density) and empty pixels' RGB never bleeds in;
  its private and output targets are HalfFloat for that reason. An `iterations`
  prop (default 1, no control yet) repeats the H+V pair, staying premultiplied
  between iterations, if a softer falloff is ever needed. `sobel-blur` and
  `diffuse-composition-blur` are its two instances; each blurred stage keeps
  its source's debug display.
- Register a mesh/group for normalization with `useWatercolorSubject(ref, id)`.
  Each subject's mesh bounds are evaluated once per rendered frame.
- Scene-capture passes save and restore the renderer's active target and clear
  color state, so they remain isolated as the pipeline gains new stages.

`PIPELINE_STAGES` in `src/config/constants.js` is the source of truth for graph
nodes, edges, debug views, debug sources (`debugView → fbos[fboKey]`, derived in
`MultiPassPipeline`), and debug displays (`debugMode` → `DEBUG_MODES`, the
`uMode` values in `debugFragment.frag`; stages without one show plain color). `scene` is both the
graph's source and the raw scene probe. The on-screen graph lays stages out automatically: columns
follow data depth, with every stage that feeds others placed as late as its
consumers allow (so `substrate` enters just before `output`),
and each stage sits at the average row of its inputs so wires don't cross. A
stage fed across skipped columns (`scene → specular`) takes a free lane below
those columns, and its wire turns right after the source to run along it.
Within a column, ties keep `PIPELINE_STAGES` order, so stage order is how to
resolve a crossing (e.g. `turbulence` is listed before `depth` so its wire
into `diffuse comp` runs above the `depth → sobel` chain). A side input (a
source sharing its column with other stages, like `substrate`) sits just above
its consumer's other inputs (so `substrate` is directly above
`edge darkening`), keeping the figure rectangular; and a stage alone in its
column centers on the stages it feeds (`scene`, and `diffuse` midway between
color override and dilution).
Each column is as wide as its widest measured label, and the figure shrinks to
fit narrow windows rather than scrolling the page. Every label keeps the same
clearance (`WIRE_GAP`): wires stop that far from it, and every bend lives in
the gap after the source's column, between the widest labels on either side,
as one smooth cubic S-curve. Wires sharing a gap therefore bend together
(the fan out of `scene` is aligned, and merging wires join like streams) and
never cut through a label. There are no end dots.
It is styled as a printed figure plate: small-caps serif labels (Cormorant SC
and EB Garamond, loaded in `index.html`) on a frosted vellum sheet (translucent
paper tint plus backdrop blur, so the ink reads over every debug view while the
render shows through); hairline ink wires in flowing curves; and the stage
being viewed resting in a soft pastel wash of the base pigment color (the
Color Override base color mixed toward paper white, with blurred, wavering
edges; `App` passes it in as `washColor`). Hover and focus show a fainter
wash. Stage labels are display-only and
kept short (e.g. `diffuse comp`); the caption's "now showing" spells the
viewed stage's key with spaces (e.g. `diffuse composition blur`).
Update metadata, mounts,
controls, and docs together when changing passes.

The Leva panel (`src/dev/usePipelineControls.js`) exposes only live controls,
with **Inspect** first, then folders grouped by what they change in the
painting, then the Session:

- **Inspect**: `view` (any debug view) and, only while viewing `scene`, the
  RGB/alpha `channel`.
- **Light**: `position` (shared world-space light); **Diffuse** › `diffuse
  intensity` (flat-to-Lambert); **Specular** › `shininess`, `strength`,
  `threshold` (also sizes the bare-paper highlights; strength 0 removes them).
- **Pigment**: `override` (Color Override on/off), `base color`, `shadow
  color`, `dilution`; **Turbulence** › `intensity` (0–1, 0 = off), `scale`
  (noise cycles per object unit), `octaves` (1–6), `warp` (0 = plain fBm);
  **Wetness** › `paint blur` (diffuse composition blur, CSS px, 0–16, 0 = off).
- **Edges**: `darkening` (`k`, 0–5, 0 = off), `width` (sobel blur radius, the
  thesis's `W`, CSS px, 0–16); **Detection** › `sobel strength`, `sobel radius`
  (integer source pixels), `bounding boxes` (orange subject bounds drawn over
  the depth and sobel views; `DebugPass` draws them after the probe without
  changing it).
- **Substrate**: `height map` first (overrides any view with the substrate's
  grayscale height; picking a view from Inspect or the graph turns it off),
  `color`, `scale`; **Distortion** › `enabled`, `amount` (0–8 CSS px);
  **Lighting** › `enabled`, `angle` (degrees, 0 = from the right,
  counter-clockwise; default 66), `strength` (`ds`), `roughness` (`r`). Each
  effect's settings show only while it is enabled.
- **Session**: save, reset to defaults, copy values.

Control keys match the pipeline prop names (e.g. `diffuseAmount`), so each
folder's values spread straight into `MultiPassPipeline`, saved sessions stay
compatible, and reset restores each folder from `DEFAULTS` by key. Escape,
click-out, and re-click return the debug view to `output`.

## Source layout

- `src/pipeline/passes/ScenePass.jsx`: original-material scene capture (the `scene` probe).
- `src/pipeline/passes/SubstratePass.jsx`: procedural paper source capture.
- `src/pipeline/passes/DepthPass.jsx`: transformed-bounds ranges, depth pre-pass, and normalized per-subject depth.
- `src/pipeline/passes/DiffusePass.jsx`, `SpecularPass.jsx`: geometry lighting captures.
- `src/pipeline/passes/ColorOverridePass.jsx`, `DilutionPass.jsx`: diffuse-derived image passes.
- `src/pipeline/passes/DiffuseCompositionPass.jsx`: pigment + density join of those two.
- `src/pipeline/passes/SobelPass.jsx`: depth Sobel edge composite.
- `src/pipeline/passes/BlurPass.jsx`: reusable premultiplied separable Gaussian blur.
- `src/pipeline/passes/TurbulencePass.jsx`: object-space Perlin fBm capture for pigment turbulence.
- `src/pipeline/passes/EdgeDarkeningPass.jsx`: diffuse blur concentrated along blurred sobel edges.
- `src/pipeline/passes/OutputPass.jsx`: the finished painting to screen: highlights, substrate distortion, and lighting over edge darkening.
- `src/pipeline/WatercolorSubjects.jsx`: registration context and hook.
- `src/shaders/`: capture, substrate, depth, output, and debug shaders;
  `src/shaders/chunks/oklab.glsl` is shared OKLab pigment concentration.
- `src/components/PipelineDiagram.jsx`: graph derived from `PIPELINE_STAGES`.
- `EXPLAINER.md`: implemented behavior overview.

## Adding the next pass

1. Add the pass/shader and explicit frame priority.
2. Add a `PIPELINE_STAGES` entry (with `debugMode` if it needs a non-color
   display), mount the pass with its FBO refs, and add only live controls.
   Debug sources and modes are derived from the stage entry. Reusing
   `BlurPass` on another signal is one stage entry plus one JSX line.
3. Preserve the neutral empty-pixel/coverage convention. `OutputPass` is the
   final composite, so a new signal reaches the painting only once it is
   wired into the paint layer or `output` deliberately.
4. Update this file and `EXPLAINER.md`.
5. Run lint/build and visually inspect output plus every debug view.
