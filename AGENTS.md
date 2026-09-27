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
        ┌─────────────────────────┼───────────────────┐
    raw-depth                  diffuse            specular
        │                  ┌──────┴──────┐            │
normalized-depth    color-override   dilution         │
        │                  └──────┬──────┘            │
      sobel              diffuse-composition          │
        │                         │                   │
   sobel-blur         diffuse-composition-blur        │       substrate
        └────────────┬────────────┘                   │           │
              edge-darkening                          │       gradient
                     └──────────────────────┬─────────┴───────────┘
                                      substrate-fx
                                            │
                                         output
```

| Priority | Stage | Result |
|---:|---|---|
| `0` | `SubstratePass` | Procedural paper in HalfFloat `fbos.substrate`; RGB = paper color, A = height. |
| `0.1` | `GradientPass` | Signed substrate slope in `fbos.gradient`; RG = ∇h per paper unit. |
| `1` | `ScenePass` | Original-material RGBA scene capture in `fbos.scene` (the `scene` probe). |
| `2` | `RawDepthPass` | Independent capture in `fbos.rawDepth`; R = linear view distance, A = coverage. |
| `3` | `DiffusePass` | Scene capture of flat-to-Lambert response in RGB, with coverage alpha. |
| `3.1` | `ColorOverridePass`, `DilutionPass` | Parallel fullscreen transforms of `fbos.diffuse`. |
| `3.15` | `DiffuseCompositionPass` | Join in `fbos.diffuseComposition`; RGB = color-override pigment, A = dilution density. |
| `3.2` | `SpecularPass` | Independent thresholded Blinn–Phong highlight mask. |
| `4` | `NormalizedDepthPass` | Per-subject 0–1 visible depth in `fbos.normalizedDepth`. |
| `4.1` | `SobelPass` | Continuous edge magnitude in `fbos.sobel`. |
| `4.2` | `BlurPass` ×2 | Gaussian blurs of `fbos.sobel` → `fbos.sobelBlur` and `fbos.diffuseComposition` → `fbos.diffuseCompositionBlur`. |
| `4.25` | `EdgeDarkeningPass` | Paint layer in `fbos.edgeDarkening`: diffuse blur concentrated along `fbos.sobelBlur` edges. |
| `4.3` | `SubstrateFxPass` | The finished painting in `fbos.substrateFx`: paint on paper, specular highlights lifted to bare paper, toggleable substrate distortion and lighting. |
| `5` | `OutputPass` | Draws `fbos.substrateFx` opaque to screen. |
| `6` | `DebugPass` | Replaces output with the selected probe. |

Prioritized `useFrame` callbacks disable React Three Fiber's automatic render.
`MultiPassPipeline` mounts flat sibling passes that communicate by FBO refs in
priority order.

## Data and debug contract

- `scene` empty pixels are transparent black; `raw-depth` and
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
  near-white `#f7f1ec`. Unlike coverage signals, its debug view
  never checkerboards; the Substrate `height map` toggle displays alpha as
  grayscale. Its target is HalfFloat so 1-texel height differences are smooth.
  It reaches output only through `gradient` and `substrate-fx`.
- `gradient` is the substrate slope ∇h from central differences of substrate
  alpha, stored signed in HalfFloat RG as height change per paper unit
  (× DPR × scale, so it's O(1) and independent of zoom and `scale`). It
  points uphill, x right and y screen-down; B = 0, A = 1. Its debug view maps
  signed values as `0.5 + 0.5 · v`, so flat paper reads mid-gray.
- `edge-darkening` follows Montesdeoca §5.2.1: `Ed = k · Eb`, where `Eb` is
  `sobel-blur`'s un-premultiplied edge (the premultiplied blur keeps the rim
  from being diluted by empty background; its width is the thesis's `W`), and
  the paint concentrates as **the same hue, darker and richer**. In OKLab
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
- `substrate-fx` is the finished painting. It follows Montesdeoca §5.3 in
  thesis order over `edge-darkening`: **distortion** samples the paint at
  `uv + amount · ∇h` (CSS px; sampling uphill slides pigment into valleys),
  then **specular highlights** lift pigment (`a *= 1 − specular.a`, sampled at
  the same distorted UV) so they are left as bare paper, which keeps its tooth
  and is lit like the rest; then the paint is laid over the flat substrate
  **color uniform** by density
  (not the substrate RGB, whose baked relief would be lit twice), then
  **lighting** multiplies by `Id = 1 − ds·(1 − max(L·N, 0))` with
  `N = normalize(−r·∇h, 1)` rebuilt from the gradient (no separate normal
  target) and `L` from a screen-space light angle. Each effect has its own
  toggle; both off is plain edge-darkened paint on flat paper. It is opaque RGB,
  and `output` draws it to screen unchanged; the paper color is the
  background, so there is no separate background control. Depth-aware
  distortion (§5.3.1's front-object test) is deferred.
- `raw-depth` is unnormalized linear camera-view distance in scene units. Its
  debug view maps camera near/far to grayscale, but downstream shaders must not
  treat that preview mapping as stored data.
- `diffuse` is a grayscale flat-to-Lambert response in RGB with geometric
  coverage in alpha. `color-override` maps that response from shadow to base
  pigment color; when disabled it applies the base pigment color under the
  Lambert response. `dilution`
  is a diffuse-driven coverage signal written identically to RGB and alpha.
  `diffuse-composition` joins them into one watercolor layer: RGB is the
  color-override pigment and A is dilution density (already coverage-masked),
  composited over paper as `mix(paper, rgb, a)` in `substrate-fx`. It has no
  controls of its own; its debug view blends pigment over the checkerboard by
  density.
  `specular` is a binary Blinn–Phong RGBA mask; `substrate-fx` uses its alpha
  to leave highlights unpainted.
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
consumers allow (so `substrate → gradient` enters just before `substrate-fx`),
and each stage sits at the average row of its inputs so wires don't cross. A
stage fed across skipped columns (`scene → specular`) takes a free lane below
those columns, and its wire turns right after the source to run along it.
Each column is as wide as its widest measured label, and the figure shrinks to
fit narrow windows rather than scrolling the page.
It is styled as a printed figure plate: small-caps serif labels (Cormorant SC
and EB Garamond, loaded in `index.html`) on a frosted vellum sheet (translucent
paper tint plus backdrop blur, so the ink reads over every debug view while the
render shows through); hairline ink wires measured to stop just short of each
label; and a cyan brushstroke under the stage being viewed. Stage labels are
display-only and kept short (e.g. `norm. depth`).
Update metadata, mounts,
controls, and docs together when changing passes.

The Leva panel exposes only live controls: a Lighting folder
with Diffuse, Color Override, Specular, and Dilution subfolders (Specular also
sizes the painting's bare-paper highlights; strength 0 removes them); and Debug view.
The Sobel section exposes edge strength and an integer source-pixel radius.
The Blur section exposes a CSS-pixel radius per blur instance (`diffuse`,
`sobel`; 0–16, 0 = off). The sobel radius is also the edge darkening width.
The Edge Darkening section exposes `strength` (`k`, 0–5, 0 = off).
The Substrate FX section has a `distortion` toggle with its `amount` (0–8 CSS
px), and a `lighting` toggle with `light angle` (degrees, 0 = from the right,
counter-clockwise; default 66), `light strength` (`ds`), and
`roughness` (`r`); each effect's settings show only while it is on.
The Substrate section exposes a `height map` toggle first, then paper color and
scale. Turning `height map` on overrides the selected debug view with the
substrate's grayscale height from any view; picking a view from the Debug
dropdown or the pipeline graph turns it back off.
`show bounding boxes` appears while probing normalized depth, and RGB/alpha
channels only while inspecting `scene`.
`DebugPass` draws bounds after the FBO probe without changing it. Escape,
click-out, and re-click return the debug view to `output`.

## Source layout

- `src/pipeline/passes/ScenePass.jsx`: original-material scene capture (the `scene` probe).
- `src/pipeline/passes/SubstratePass.jsx`: procedural paper source capture.
- `src/pipeline/passes/RawDepthPass.jsx`: independent floating-point depth capture.
- `src/pipeline/passes/DiffusePass.jsx`, `SpecularPass.jsx`: geometry lighting captures.
- `src/pipeline/passes/ColorOverridePass.jsx`, `DilutionPass.jsx`: diffuse-derived image passes.
- `src/pipeline/passes/DiffuseCompositionPass.jsx`: pigment + density join of those two.
- `src/pipeline/passes/NormalizedDepthPass.jsx`: transformed-bounds ranges and normalized image.
- `src/pipeline/passes/SobelPass.jsx`: normalized-depth Sobel edge composite.
- `src/pipeline/passes/BlurPass.jsx`: reusable premultiplied separable Gaussian blur.
- `src/pipeline/passes/GradientPass.jsx`: signed substrate slope from height.
- `src/pipeline/passes/EdgeDarkeningPass.jsx`: diffuse blur concentrated along blurred sobel edges.
- `src/pipeline/passes/SubstrateFxPass.jsx`: the finished painting: highlights, distortion, and lighting over edge darkening.
- `src/pipeline/passes/OutputPass.jsx`: draws substrate fx to screen.
- `src/pipeline/WatercolorSubjects.jsx`: registration context and hook.
- `src/shaders/`: capture, substrate, normalized-depth, output, and debug shaders.
- `src/components/PipelineDiagram.jsx`: graph derived from `PIPELINE_STAGES`.
- `EXPLAINER.md`: implemented behavior overview.

## Adding the next pass

1. Add the pass/shader and explicit frame priority.
2. Add a `PIPELINE_STAGES` entry (with `debugMode` if it needs a non-color
   display), mount the pass with its FBO refs, and add only live controls.
   Debug sources and modes are derived from the stage entry. Reusing
   `BlurPass` on another signal is one stage entry plus one JSX line.
3. Preserve the neutral empty-pixel/coverage convention. Output shows
   `substrate-fx`, so a new signal reaches the painting only once it is wired
   into the paint layer or `substrate-fx` deliberately.
4. Update this file and `EXPLAINER.md`.
5. Run lint/build and visually inspect output plus every debug view.
