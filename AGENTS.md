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
                ┌───────────────────────────┬──┴──────────────┬───────────────┐
             diffuse                   turbulence           depth         specular
       ┌────────┴─────────┐                 │                 │               │
color-override        dilution              │               sobel             │             substrate
       └──────────────────┼─────────────────┘                 │               │                 ├───────────────┬───────┐
                 diffuse-composition                     sobel-blur           │           granulation*     dry-brush*   │
                          │                                   │               │                 │               │       │
              diffuse-composition-blur                        │               │                 │               │       │
                          └─────────────────┬─────────────────┘               │                 │               │       │
                                     edge-darkening                           │                 │               │       │
                                            └─────────────────────────────────┴───┬─────────────┴───────────────┴───────┘
                                                                               output

* granulation and dry-brush also read diffuse to weight the paper (`reads`, not drawn)
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
| `4.3` | `GranulationPass`, `DryBrushPass` | Substrate height × `fbos.diffuse`: signed settling in HalfFloat `fbos.granulation`; bare-paper mask in `fbos.dryBrush`. Read by output. |
| `5` | `OutputPass` | The finished painting, drawn to screen: edge-darkened paint, highlights lifted, on paper with toggleable substrate distortion and lighting (paper slope computed inline), then the cursor. |
| `6` | `DebugPass` | Replaces output with the selected probe. |

Prioritized `useFrame` callbacks disable React Three Fiber's automatic render.
`MultiPassPipeline` mounts flat sibling passes that communicate by FBO refs in
priority order.

**The painting repaints only when it can have changed**
(`src/pipeline/PaintingFrame.jsx`). Every pass before `output` registers with
`usePaintFrame` instead of `useFrame`, so it runs only on frames that repaint;
its FBO keeps the last result otherwise. `PaintingFrameProvider` decides at
`PAINTING_CHECK_FRAME_ORDER` (−0.5: after `SmoothZoom` and OrbitControls move
the camera, before any pass): it repaints when the camera's world or
projection matrix, a registered subject mesh's world matrix (compared within
`1e-4`, about a tenth of a pixel, because OrbitControls' damping never quite
stops), or the drawing-buffer size changed, or when the pipeline or any
painting pass re-rendered (a prop change, a new subject, a hot reload). Nothing
in the painting is time-animated; anything that should be must move a tracked
matrix or re-render. `OutputPass` and `DebugPass` still draw every frame (one
fullscreen pass each), so a still painting costs one draw per frame and the
cursor keeps the display's frame rate; the full pipeline (~20 draws) runs only
while the view moves or a control changes. Before this, every frame repainted
everything and a 1440×900 window ran ~40 fps, which made the cursor lag.

## Stage and render scale

The pipeline is authored on a **virtual stage**: every "CSS pixel" length (blur
radii, paper scale, distortion) is in stage pixels, measured as if the window's
short side were `STAGE_REFERENCE_SIZE` (800). `pixelsPerStageUnit(state)` in
`src/pipeline/utils/viewScale.js` is the one conversion to device pixels
(`gl.getPixelRatio() × shortSide ÷ STAGE_REFERENCE_SIZE`); `BlurPass`,
`SubstratePass`, and `OutputPass` use it instead of the raw pixel ratio, so a
phone and an ultrawide show the same painting in the same proportions. Never
read `gl.getPixelRatio()` for a CSS-pixel length. (The one exception is the
cursor, which is deliberately sized in real CSS pixels like a system cursor;
see the `output` contract.) `useRenderDpr()` caps the
canvas density so the short side never renders more than
`RENDER_MAX_SHORT_SIDE` (1440) device pixels (constant cost on large screens;
the browser upscales). `ContainFit` fits the camera to the short side (vertical
FOV kept in landscape, widened in portrait), so the subject takes the same share
of the screen in any window shape. Sobel `radius` stays in source pixels. The
overlay plates are fixed CSS size and are not part of the stage.

## Data and debug contract

- `scene` empty pixels are transparent black; `depth` empty pixels have alpha
  zero. Checkerboards exist only in
  debug presentation, never in stored data; cells are fixed screen-space squares
  rather than UV-scaled tiles.
- `substrate` is opaque procedural cold-press paper tuned against a real paper
  photo. A is a clamped 0–1 height: a 3-octave gradient-noise fBm, slightly
  vertically elongated and laterally warped (the paper tooth), plus fine grain
  and a faint broad drift. It uses a sin-free hash for GPU stability and is
  evaluated in CSS pixels from the screen center divided by the zoomed scale
  (`scale` × camera zoom, from `src/pipeline/utils/paperZoom.js`: initial
  camera distance ÷ distance to the default controls' target, floored at
  `MIN_PAPER_SCALE`). It stays fixed through orbiting, panning, and DPR changes
  but grows about the screen center as the camera zooms in, so zooming in
  zooms into the paper; `OrbitControls` is `makeDefault` so the target is
  readable. RGB is the paper color
  lit softly from the upper left across the height's slope (plus a slight
  height tint), so the visible tooth is the stored height. Default color is the
  near-white `#f7f1ec`. Its debug view is the output drawn without the
  paint (`OutputPass` `paperOnly`: flat paper color under the same lighting,
  so it looks exactly like the paper under the painting, never a
  checkerboard); the Substrate `height map` toggle instead draws alpha as
  grayscale through `DebugPass`. Its target is HalfFloat so 1-texel height differences are smooth.
  `output` reads it directly: the paper slope ∇h comes from central
  differences of its alpha, as height change per paper unit (× DPR × zoomed
  scale, so it's O(1) and independent of zoom and `scale`). Distortion is
  multiplied by the zoom magnification so the paint's shift grows with the
  paper, pointing uphill with x
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
- **The cursor** is drawn last in `output`, in place of the system cursor: a
  perfect near-black ink ring (`CURSOR_INK`) around a window onto the bare
  substrate, so wherever it points, paper or painting, it shows the substrate
  pass's own RGB (with its baked relief, unlit, read at the undistorted pixel
  so the tooth stays fixed while the cursor moves). The ring itself is nudged
  by the paper slope (`CURSOR_DISTORTION`, 0.75 px per unit slope, its own and
  not magnified by zoom); it has no granulation or dry brush. Its lengths are
  real CSS pixels converted with `gl.getPixelRatio()` (radius
  `CURSOR_RADIUS` 6 to the line's middle, `CURSOR_LINE_WIDTH` 1), placed by
  `gl_FragCoord`, so it keeps a system cursor's size at any window size or
  zoom. Holding a button eases the radius to `CURSOR_PRESSED_SCALE` (0.88).
  `usePaintingCursor` (`src/pipeline/utils/paintingCursor.js`) tracks the
  mouse on `window` and sets `cursor: none` on the canvas; the cursor shows
  only while the canvas is the event target (or holds pointer capture, as
  OrbitControls does mid-drag), so the plates keep their own system cursors,
  and never for touch. It is enabled only while the painting is on screen
  (`output`, or `substrate` without its height map); debug probes keep the
  system cursor. There is no control for it.
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
- `granulation` and `dry-brush` (Montesdeoca §5.1.2) are paper effects:
  fullscreen transforms of the substrate height `h`, weighted per pixel by
  `diffuse` (same-size screen-space targets; the paper's zoom scaling carries
  through). The graph draws `substrate → granulation, dry-brush → output`; the
  diffuse read is listed in `reads`, not `inputs`, and left undrawn for
  simplicity. They are **applied in `output`, not diffuse composition**:
  after the distortion lookup, but sampled at the undistorted pixel, so the
  paint slides into the valleys while the grain and the bare peaks stay on
  the tooth you see (and after the paint blur, so they stay crisp). There
  granulation is an Eq. 5.1 offset on the edge-darkened paint (`g > 0`:
  `concentratePigment` and `a' = 1 − (1 − a)^(1+g)`; `g < 0`: `a *= 1 + g`;
  `OutputPass` prepends the OKLab chunk), then dry brush lifts pigment
  (`a *= 1 − d`), then the specular lift. Edge darkening is already in the
  paint and its edges come from depth, so dry-brush gaps are clean bare paper
  with no dark rim. Granulation intensity 0 and dry brush amount 0 are an
  exact passthrough.
  **Granulation** settles pigment into the valleys, weighted toward shadow:
  `g = intensity · (1 − diffuse)^1.5 · (1 − 2h) · coverage`, signed like
  turbulence (+ collects in valleys, − drains off peaks), HalfFloat, signed
  debug view. **Dry brush** leaves the peaks bare wherever the light is above
  a threshold, evenly: `lit = smoothstep(lt − ls, lt + ls, diffuse)`
  (`lt` = light threshold, `ls` = light softness), `reach = amount · lit`, threshold
  `t = 1 + s − reach · (1 + 2s)`, `d = smoothstep(t − s, t + s, h) · coverage`
  (`s` = softness; amount 0 skips nothing). With `density` above 0, `h` there is
  how far the point rises above the mean of a ring of eight height taps around
  it, rescaled to the paper's spread so the dry area for a given amount is
  unchanged: only local peaks count, so the flecks are smaller, denser, and
  evenly spread instead of gathering on the paper's broad hills and merging into
  large patches as the amount grows. The ring runs from 2 paper units at low
  density to 0.3 at 1 (`DryBrushPass`); density 0 is the paper's own height.
  `mask` debug view (dark where the brush laid paint, white where it left the paper bare, checkerboard off the object; the `coverage` view only showed A, which is solid on the object).
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
  `outputRef`, `radius`). `radius` is in stage pixels (≈3σ, scaled by
  `pixelsPerStageUnit` so zoom and window size don't change it); 0 passes the input through. Taps stay
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
consumers allow (so `substrate` enters just before `granulation`, `dry-brush` and `output`),
and each stage sits at the average row of its inputs so wires don't cross. A
stage fed across skipped columns (`scene → specular`, `substrate → output`) takes
the clear row nearest its inputs' average in every skipped column (falling back
to a free lane below those columns), and its wire turns right after the source
to run along it.
Within a column, ties keep `PIPELINE_STAGES` order, so stage order is how to
resolve a crossing (e.g. `turbulence` is listed before `depth` so its wire
into `diffuse comp` runs above the `depth → sobel` chain). A side input (a
source sharing its column with other stages) sits just above its consumer's
other inputs when they are placed, else after the column's other stages. Then,
right to left, **every stage that branches into two or more stages sits
midway between its outermost children** (`diffuse` between color override and
dilution, `substrate` between its wire into `output` and `dry brush`, `scene`
across its fan), moving only where that row is free in its column; a stage
alone in its column centers on its children the same way. A side source
that also feeds past the next column (`substrate → output`) keeps its own row
free there as a straight lane, and the stages it feeds in that column straddle
the lane, half above and half below (`granulation` above, `dry brush` below;
they win row ties). So substrate's wire runs straight into `output`, which
sits on the same row with its five inputs fanning in symmetrically. The result
is two bands: the paint chain on top, and the paper band under `edge
darkening`, with `specular` on the bottom lane.
Each column is as wide as its widest measured label, and the figure shrinks to
fit narrow windows rather than scrolling the page. Every label keeps the same
clearance (`WIRE_GAP`): wires stop that far from it, and every bend lives in
the gap after the source's column, between the widest labels on either side,
as one smooth cubic S-curve. Wires sharing a gap therefore bend together
(the fan out of `scene` is aligned, and merging wires join like streams) and
never cut through a label. There are no end dots.
It is Fig. 1 on the shared figure plate (`src/components/Plate.jsx` +
`Plate.css`, also used by the debug panel): small-caps serif labels (Cormorant SC
and EB Garamond, loaded in `index.html`) on a frosted vellum sheet (translucent
paper tint plus backdrop blur, so the ink reads over every debug view while the
render shows through); hairline ink wires in flowing curves; and the stage
being viewed marked by a single watercolor droplet of the base pigment color
just before its label (where its incoming wires land; a turbulence-displaced
circle with a small glint) and its label inked in that pigment deepened toward
the ink (the Color Override base color, which `App` sets as `--plate-wash` on
`<html>`).
The drop pops in with a slight overshoot; focus shows a faint drop. `output` carries the drop whenever the painting is shown, including by default. Every pigment accent (hovered and focused labels, the caption's "now showing" name, the fold chevron's hover) takes the same deepened base pigment (`--plate-wash-ink`, on `:root` in `Plate.css`); there is no fixed accent color. Stage labels are display-only and
kept short (e.g. `diffuse comp`); the caption's "now showing" spells the
viewed stage's key with spaces (e.g. `diffuse composition blur`).
The caption title is also the fold toggle (all of this lives in `Plate`):
clicking "Fig. 1 — the watercolor pipeline" (a real button with
`aria-expanded`) folds the plate up under its caption line, leaving the title
and the caption's aside ("now showing") visible, and the small inked
tick to the left of the title turns to point at the folded plate. Folded, the
caption drops its bottom gap and rule so the strip's padding is even above and
below the text. The plate collapses by
animating a one-row grid to `0fr` (content stays rendered, so label
measurement still works) and is `inert` while folded. The folded state is a
per-viewer convenience in `localStorage` under each plate's `storageKey`
(`pipeline-diagram-collapsed`, `debug-panel-collapsed`; every access guarded so
it defaults to unfolded when storage is unavailable).
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
  **Granulation** › `intensity` (0–1, 0 = off); **Dry brush** › `amount`
  (0–1, 0 = off), `density` (0–1, 0 = the paper's own height; more breaks the
  dry areas into smaller, denser, evenly spread flecks), `threshold` (0–1,
  diffuse level above which it applies),
  `softness` (0.01–0.3, how feathered the bare peaks are), `transition`
  (0.01–0.3, fade width around the threshold);
  **Wetness** › `paint blur` (diffuse composition blur, CSS px, 0–16, 0 = off).
- **Edges**: `darkening` (`k`, 0–5, 0 = off), `width` (sobel blur radius, the
  thesis's `W`, CSS px, 0–16); **Detection** › `sobel strength`, `sobel radius`
  (integer source pixels), `bounding boxes` (orange subject bounds drawn over
  the depth and sobel views, and togglable only while viewing one of them;
  `DebugPass` draws them after the probe without changing it).
- **Substrate**: `height map` first (disabled unless viewing `substrate`;
  displays its grayscale height instead of the tinted paper),
  `color`, `scale`; **Distortion** › `enabled`, `amount` (0–8 CSS px);
  **Lighting** › `enabled`, `angle` (degrees, 0 = from the right,
  counter-clockwise; default 120), `strength` (`ds`), `roughness` (`r`). Each
  effect's settings show only while it is enabled.
- **Session**: save, reset to defaults, copy values.

It is presented as **Fig. 2 — the controls** (`src/components/DebugPanel.jsx`):
the same plate docked top-right, holding `<Leva fill flat titleBar={false}>`
(no drag or search; the plate's caption folds it), so it renders in place
rather than as Leva's fixed dark root. `PLATE_THEME` maps Leva's Stitches
tokens onto the plate: clear `elevation1`/`elevation2` so the vellum shows, a
faint ink tint for fields, ink and ink-soft text, Cormorant SC for folders, and
accents (`accent1–3`, slider fills, focus, checkboxes) built from
`var(--plate-wash-ink)` so they follow the base color live. `DebugPanel.css`
reaches what tokens can't with tag selectors scoped to `.debug-panel` (Leva's
classes are hashed): EB Garamond italic labels, lining tabular figures in
inputs, Session buttons as small-caps caption type, ledger lines (each
control row, the div two levels above its `label`, padded 4px above and below
with a faint hairline beneath; the theme's `rowGap` is 0 so every row is the
same height; a section's last row, directly or in its last subsection, drops its line so only the section rule shows), a darker hairline between top-level sections (selected through
Stitches' `isRoot-true` variant class, with doubled `.debug-panel` to outrank
Leva's own rule), and folder chevrons repainted as the plates' inked chevron
(Leva's triangle path hidden, the chevron drawn as a CSS mask on the same svg,
so Leva's open/closed rotation still applies). The body scrolls
inside the plate when every folder is open. The panel moves and resizes:
dragging anywhere on its caption row moves it (after 4px, so a plain click on
the title still folds it; the dotted grip also takes arrow keys, 10px, and
double-click re-docks it top-right), and a hatched grip at the bottom-left
corner resizes it, keeping the right edge and top fixed (min 260px wide, body
min 120px). The panel stays inside the same 12px inset from the window edge
that Fig. 1 keeps from the top and left (mirrored right and bottom, where the
caption stays reachable). `Plate` takes `style`, `captionProps` (the drag
handlers) and a `corner` element (hidden while folded) for this. The frame `{ left, top, width, bodyHeight }` is a per-viewer
convenience in `localStorage` (`debug-panel-frame`, guarded; absent = docked),
clamped at render so a smaller window never strands the panel off screen;
`--dp-top` keeps the scrolling body above the window bottom and
`--dp-body-height` applies only while unfolded so folding still collapses. Clicks inside the panel never
return the graph to `output`.

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
- `src/pipeline/passes/GranulationPass.jsx`, `DryBrushPass.jsx`: paper-height settling and bare-paper masks weighted by diffuse, applied in output.
- `src/pipeline/passes/EdgeDarkeningPass.jsx`: diffuse blur concentrated along blurred sobel edges.
- `src/pipeline/passes/OutputPass.jsx`: the finished painting to screen: highlights, substrate distortion, and lighting over edge darkening, then the cursor.
- `src/pipeline/PaintingFrame.jsx`: the repaint check and `usePaintFrame`.
- `src/pipeline/utils/paintingCursor.js`: mouse tracking and system-cursor hiding for the painted cursor.
- `src/pipeline/utils/viewScale.js`: stage-pixel conversion and the render density cap.
- `src/components/ContainFit.jsx`, `SmoothZoom.jsx`: short-side camera fit and damped wheel zoom.
- `src/pipeline/WatercolorSubjects.jsx`: registration context and hook.
- `src/shaders/`: capture, substrate, depth, output, and debug shaders;
  `src/shaders/chunks/oklab.glsl` is shared OKLab pigment concentration.
- `src/components/Plate.jsx`: the shared folding figure plate (vellum, caption, fold).
- `src/components/PipelineDiagram.jsx`: graph derived from `PIPELINE_STAGES` (Fig. 1).
- `src/components/DebugPanel.jsx`: the themed Leva panel (Fig. 2).
- `EXPLAINER.md`: implemented behavior overview.

## Adding the next pass

1. Add the pass/shader and explicit frame priority. Passes that build the
   painting use `usePaintFrame`, not `useFrame`; anything new that changes
   the image over time must make the repaint check fire.
2. Add a `PIPELINE_STAGES` entry (with `debugMode` if it needs a non-color
   display), mount the pass with its FBO refs, and add only live controls.
   Debug sources and modes are derived from the stage entry. Reusing
   `BlurPass` on another signal is one stage entry plus one JSX line.
3. Preserve the neutral empty-pixel/coverage convention. `OutputPass` is the
   final composite, so a new signal reaches the painting only once it is
   wired into the paint layer or `output` deliberately.
4. Update this file and `EXPLAINER.md`.
5. Run lint/build and visually inspect output plus every debug view.
