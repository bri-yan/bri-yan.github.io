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
  └─► surface (one render into two targets)
        ├─ [0] paint layer, premultiplied ────────┐
        ├─ [1] subject depth ──► sobel ──► edges ─┴─► edge darkening (both blurs) ──► paint ─┐
        └─ [1] diffuse, specular, coverage ──────────────────────────────────────────────────┤
substrate (paper; only when zoom, size, color, or scale change) ─────────────────────────────┤
                                                                                             ▼
                                                                                         composite ──► painting ──► output, with the cursor ──► screen
```

| Priority | Pass | Runs | Result |
|---:|---|---|---|
| `−0.5` | `PaintingFrameProvider` | every rendered frame | Decides whether this frame repaints. |
| `0` | `SubstratePass` | repaints whose paper inputs changed | Procedural paper in HalfFloat `substrate`; RGB = paper color with relief, A = height. |
| `1` | `SurfacePass` | repaints | One scene render into MRT `surface` (HalfFloat, the only depth buffer): `textures[0]` = the watercolor layer, premultiplied (pigment · density, density); `textures[1]` = R diffuse, G specular mask, B subject depth (−1 off subjects), A coverage. |
| `2` | `SobelPass` | repaints | Continuous depth-edge magnitude in `edges`, premultiplied by subject coverage: (edge · cov, 0, 0, cov). |
| `3` | `EdgeDarkeningPass` | repaints | Horizontal pass blurs paint and edges at once (MRT); vertical pass finishes both blurs, un-premultiplies, and applies edge darkening into `paint` (straight pigment, A density). |
| `4` | `CompositePass` | repaints | The finished painting in 8-bit `painting`: distortion, granulation, dry brush, highlight lift, paper, lighting. |
| `5` | `OutputPass` | every rendered frame | Copies `painting` to the screen and draws the cursor over it. |

Prioritized `useFrame` callbacks disable React Three Fiber's automatic render.
`MultiPassPipeline` mounts flat sibling passes that hand render targets along
by ref in priority order, and turns the renderer's `autoClear` off: every
fullscreen pass covers its whole target, so only `SurfacePass` clears. Only
the scene render has a depth buffer; the screen has none, and no
multisampling (`App`'s `gl` options), since only fullscreen quads reach it. There are no intermediate debug views: each stage exists only as
far as the next pass needs it.

**The canvas renders on demand, and the painting repaints only when it can
have changed.** `<Canvas frameloop="demand">` renders a frame only when
something calls `invalidate()`: drei's `OrbitControls` on `change` (damping
included), `SmoothZoom` on wheel input and while it eases, the cursor
listeners on any pointer change over the painting, `OutputPass` while the
press ease runs, and `PaintingFrameProvider`/`usePaintFrame` whenever the
pipeline or a painting pass re-renders (a prop change, a new subject, a
resize, since the provider subscribes to `size` and `viewport.dpr`, or a hot
reload). drei stops asking while its damping still drifts (under 1e-3 units a
frame), so the provider keeps invalidating until the camera moves less than
`1e-6` per frame (`STILL_EPSILON`); otherwise the painting would stop short
of where the camera comes to rest. Eases measure their first step from the
input event, not from the idle frame delta (`SmoothZoom`, the press ease).
Within a rendered frame, every pass before `output` registers with
`usePaintFrame` instead of `useFrame`, so it runs only on frames that repaint;
its target keeps the last result otherwise. `PaintingFrameProvider`
(`src/pipeline/PaintingFrame.jsx`) decides at `PAINTING_CHECK_FRAME_ORDER`
(−0.5: after `SmoothZoom` and OrbitControls move the camera, before any pass):
it repaints when the camera's world or projection matrix, a registered
subject mesh's world matrix (compared within `1e-4`, about a tenth of a pixel,
against the last painted state), or the drawing-buffer size changed, or when
the pipeline or a painting pass re-rendered. `SubstratePass` then repaints the
paper only when its own inputs changed (target size, stage scale, color,
zoomed scale to seven digits), so orbiting never recomputes the noise.
Nothing in the painting is time-animated; anything that should be must move a
tracked matrix or re-render, and request a frame. Draws per frame: a still
page 0, a cursor move 1, an orbit 7, a zoom 8. Before the merge, a repaint was
~20 draws through 19 full-resolution HalfFloat targets (~750 MB at a
2304×1440 render, each with a depth buffer); a continuous orbit sustained
~36–48 repaints a second on an M2 in headless Chrome, against ~170–240 now.

## Stage and render scale

The pipeline is authored on a **virtual stage**: every "CSS pixel" length (blur
radii, paper scale, distortion) is in stage pixels, measured as if the window's
short side were `STAGE_REFERENCE_SIZE` (800). `pixelsPerStageUnit(state)` in
`src/pipeline/utils/viewScale.js` is the one conversion to device pixels
(`gl.getPixelRatio() × shortSide ÷ STAGE_REFERENCE_SIZE`); `EdgeDarkeningPass`,
`SubstratePass`, `CompositePass`, and `OutputPass` (for the paper slope) use
it instead of the raw pixel ratio, so a phone and an ultrawide show the same
painting in the same proportions. Never read `gl.getPixelRatio()` for a
CSS-pixel length. (The one exception is the cursor, which is deliberately
sized in real CSS pixels like a system cursor; see the `output` contract.)
`useRenderDpr()` caps the canvas density so the short side never renders more
than `RENDER_MAX_SHORT_SIDE` (1440) device pixels (constant cost on large
screens; the browser upscales). `ContainFit` fits the camera to the short side
(vertical FOV kept in landscape, widened in portrait), so the subject takes
the same share of the screen in any window shape. Sobel `radius` stays in
source pixels. The overlay plate is fixed CSS size and is not part of the
stage.

## Data contract

- Render targets come from drei's `useFBO` (via `useFullscreenPass`, or
  directly in `SurfacePass`), sized to the canvas's device-pixel grid, so
  every target shares one pixel grid and fullscreen passes sample them at
  `vUv`. Options live in `src/config/constants.js`: `TARGET_OPTIONS`
  (HalfFloat RGBA, linear, no depth buffer), `SURFACE_TARGET_OPTIONS` (two
  attachments plus the default depth buffer), `BLUR_TARGET_OPTIONS` (two
  attachments), `PAINTING_TARGET_OPTIONS` (8-bit, nearest). Shaders that write
  two attachments are GLSL3 (`glslVersion: THREE.GLSL3`, `layout(location =
  N) out`); `useFullscreenPass` takes `glslVersion`, and `fboOptions.count`
  for MRT. Empty pixels are neutral: `surface` clears to transparent black, so
  paint and coverage are 0 there.
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
  readable. RGB is the paper color lit softly from the upper left across the
  height's slope (plus a slight height tint), so the visible tooth is the
  stored height; only the cursor's window shows it. Default color is the
  near-white `#f7f1ec`. Its target is HalfFloat so 1-texel height differences
  are smooth. The composite and the cursor read it directly: the paper slope
  ∇h comes from central differences of its alpha (`paperSlope` in
  `src/shaders/chunks/paperSlope.glsl`), as height change per paper unit
  (× DPR × zoomed scale, so it's O(1) and independent of zoom and `scale`),
  pointing uphill with x right and y screen-down. There is no separate
  gradient target.
- `surface` is the one scene render, everything the painting reads from the
  geometry (`SurfacePass`, `surfaceVertex.vert` + `surfaceFragment.frag`; the
  OKLab and turbulence chunks are prepended). Visibility is a **depth
  pre-pass**: the whole scene renders depth-only, then everything shades with
  `LessEqual` testing and no depth writes, so each pixel is shaded once, by its
  frontmost surface (both use `surfaceVertex.vert`, so depths match exactly).
  Meshes that aren't subjects shade first, with the subjects hidden for that
  render only (depth −1); then each subject renders alone with its own depth
  range. It needs WebGL2 with `EXT_color_buffer_float`. Per pixel:
  - **diffuse** is a flat-to-Lambert response, `mix(1, max(N·L, 0), amount)`,
    from the shared world-space light (moved to view space each repaint).
  - **color override** maps it from shadow to base pigment color; when
    disabled the base pigment sits under the Lambert response. **Dilution**
    thins the lit wash: density `1 − strength · diffuse`.
  - **Pigment turbulence** (Montesdeoca §5.1.1, Eq. 5.1) then mottles that
    layer with `df = intensity · turbulence`: `df > 0` concentrates
    (`concentratePigment` by `df`, and `a' = 1 − (1 − a)^(1+df)`), `df < 0`
    thins the wash toward the paper (`a *= 1 + df`; the thesis's fade to
    `Cs`, since paper is composited later). Intensity 0 is an exact
    passthrough. The noise (`src/shaders/chunks/turbulence.glsl`) is **3D
    Perlin gradient-noise fBm evaluated at each surface's object-local
    position**, so the pattern rides with the mesh under any camera or object
    motion (no shower-door) and has no per-frame randomness. Perlin: 8 cube
    corners with Hoskins-hashed gradients, quintic fade. fBm: `octaves` (1–6;
    `MAX_OCTAVES` in the chunk is kept in sync with `TURBULENCE_MAX_OCTAVES`),
    lacunarity ≈ 2, gain 0.5, each octave rotated by a fixed orthonormal
    matrix and offset to hide grid alignment, and normalized by total
    amplitude so octaves add detail, not contrast. An optional domain `warp`
    (default 0) reads the fBm where a 3-fBm flow carries the point. The value
    is `clamp(2 · fbm, −1, 1)`. Per-subject seeds and a constant screen-space
    feature size are deferred.
  - The layer is stored **premultiplied** in `textures[0]` (pigment ·
    density, density), so the blur needs no premultiply step and bilinear
    fetches mix it correctly.
  - **specular** is a thresholded Blinn–Phong mask (0 or 1) in G; the
    composite uses it to leave highlights unpainted.
  - **subject depth** in B is per-subject normalized view depth (0 = nearest
    bound, 1 = farthest), −1 on any mesh that isn't a subject. Each subject's
    range comes from the CPU: all eight corners of every mesh's transformed
    local bounding box in camera view space. This is stable and inexpensive
    but approximate: visible mesh pixels need not reach exactly 0 or 1.
  - **coverage** in A is 1 on any mesh.
- `edges` (`SobelPass`, `sobelFragment.frag`) computes both 3×3 Sobel
  gradients of the subject depth in one pass (off the subjects, depth reads
  as 0) and writes their continuous magnitude, `clamp(|∇| · 0.25 · strength,
  0, 1)`, premultiplied by subject coverage: (edge · cov, 0, 0, cov). `radius`
  is the integer source-pixel distance between taps.
- `EdgeDarkeningPass` blurs the paint layer (the thesis's wetness, `paint
  blur`) and the edges (the edge width `W`) with separable Gaussians that
  share their two passes: the horizontal pass writes both (MRT,
  `blurHorizontalFragment.frag`), the vertical pass finishes both and applies
  edge darkening (`edgeDarkeningFragment.frag`). Each radius is in stage pixels
  (≈3σ, scaled by `pixelsPerStageUnit` so zoom and window size don't change
  it); 0 passes the signal through. `blurKernel` keeps taps ≤1 texel apart up
  to `BLUR_MAX_TAPS` (32) per side, then spreads them evenly; `setKernel`
  merges neighboring taps in pairs, each one bilinear fetch at the pair's
  weighted mean offset, into uniform arrays (`MAX_BLUR_PAIRS` in
  `chunks/blur.glsl` is half of `BLUR_MAX_TAPS`). Color stays premultiplied
  until the vertical pass un-premultiplies it, so alpha keeps its meaning
  (density, coverage) and empty pixels never bleed in; the intermediate
  targets are HalfFloat for that reason.
- **Edge darkening** follows Montesdeoca §5.2.1: `Ed = k · Eb`, where `Eb` is
  the blurred, un-premultiplied edge (the premultiplied blur keeps the rim
  from being diluted by empty background), and the paint concentrates as
  **the same hue, darker and richer** (`concentratePigment` in
  `src/shaders/chunks/oklab.glsl`, shared with pigment turbulence and
  granulation and prepended to each fragment source by its pass). In OKLab
  (after decoding the display-encoded RGB to linear), lightness is scaled by
  `1 − 0.3·t` and chroma (a, b) by `1 + 0.35·t`, with `t = 1 − e^(−Ed)`, so
  rims deepen smoothly and never reach black. Out-of-gamut results keep
  lightness and hue and back chroma off (8-step bisection) rather than
  clamping channels, which would reintroduce the hue drift. This replaces the
  thesis's per-channel `C^(1+Ed)`, which cannot darken channels at 1.0 and
  drifts every rim toward the strongest channel (both default pigments have
  blue = 1, so all rims turned the same electric blue); a plain lightness
  scale was also tried and read muddy. Density still concentrates by the
  thesis power, `a' = 1 − (1 − a)^(1+Ed)` (the paper's show-through), so
  diluted rims gain pigment; the layer contract (RGB pigment, A density) is
  kept for later effects. `k = 0` is an exact passthrough. Per-object painted
  width/intensity is out of scope.
- `painting` (`CompositePass`, `compositeFragment.frag`) is the finished
  painting, 8-bit like the screen it is copied to. It follows Montesdeoca §5.3
  in thesis order over the edge-darkened `paint`: **distortion** samples the
  paint at `uv + amount · ∇h` (CSS px, multiplied by the zoom magnification so
  the paint's shift grows with the paper; sampling uphill slides pigment into
  valleys), then **granulation** and **dry brush** (below), then **specular
  highlights** lift pigment (`a *= 1 − specular`, sampled at the same
  distorted UV) so they are left as bare paper, which keeps its tooth and is
  lit like the rest; then the paint is laid over the flat substrate **color
  uniform** by density (not the substrate RGB, whose baked relief would be lit
  twice), then **lighting** multiplies by `Id = 1 − ds·(1 − max(L·N, 0))` with
  `N = normalize(−r·∇h, 1)` rebuilt from the inline slope (no separate normal
  target) and `L` from a screen-space light angle. Each effect has its own
  toggle (Substrate › Distortion and Lighting); both off is plain
  edge-darkened paint on flat paper. It is opaque; the paper color is the
  background, so there is no separate background control. Depth-aware
  distortion (§5.3.1's front-object test) is deferred.
- **Granulation** and **dry brush** (Montesdeoca §5.1.2) are paper effects,
  computed inline in the composite from the substrate height `h` and the
  surface's diffuse light and coverage, all at the **undistorted** pixel: the
  paint slides into the valleys while the grain and the bare peaks stay on the
  tooth you see (and after the paint blur, so they stay crisp). Edge darkening
  is already in the paint and its edges come from depth, so dry-brush gaps are
  clean bare paper with no dark rim. Granulation intensity 0 and dry brush
  amount 0 are an exact passthrough.
  **Granulation** settles pigment into the valleys, weighted toward shadow:
  `g = intensity · (1 − diffuse)^1.5 · (1 − 2h) · coverage`, signed like
  turbulence and applied as an Eq. 5.1 offset on the edge-darkened paint
  (`g > 0`: `concentratePigment` and `a' = 1 − (1 − a)^(1+g)`, collecting in
  valleys; `g < 0`: `a *= 1 + g`, draining off peaks). **Dry brush** then
  lifts pigment (`a *= 1 − d`) off the peaks wherever the light is above a
  threshold, evenly: `lit = smoothstep(lt − ls, lt + ls, diffuse)` (`lt` =
  light threshold, `ls` = light softness), `reach = amount · lit`, threshold
  `t = 1 + s − reach · (1 + 2s)`, `d = smoothstep(t − s, t + s, h) · coverage`
  (`s` = softness; amount 0 skips nothing).
- `output` (`OutputPass`, `outputFragment.frag`) draws every rendered frame:
  it copies `painting` to the screen and draws **the cursor** over it, in
  place of the system cursor: a perfect near-black ink ring (`CURSOR_INK`)
  around a window onto the bare substrate, so wherever it points, paper or
  painting, it shows the substrate's own RGB (with its baked relief, unlit,
  read at the undistorted pixel so the tooth stays fixed while the cursor
  moves). The ring itself is nudged by the paper slope (`CURSOR_DISTORTION`,
  0.75 px per unit slope, its own and not magnified by zoom); it has no
  granulation or dry brush. Its lengths are real CSS pixels converted with
  `gl.getPixelRatio()` (radius `CURSOR_RADIUS` 6 to the line's middle,
  `CURSOR_LINE_WIDTH` 1), placed by `gl_FragCoord`, so it keeps a system
  cursor's size at any window size or zoom. Only pixels within its reach
  (radius + line + 1 + `CURSOR_DISTORTION` × `MAX_PAPER_SLOPE` 16, a generous
  bound on the slope) read the paper; every other pixel is a single texture
  fetch. Holding a button eases the radius to `CURSOR_PRESSED_SCALE` (0.88).
  `usePaintingCursor` (`src/pipeline/utils/paintingCursor.js`) tracks the
  mouse on `window`, sets `cursor: none` on the canvas, and requests a frame
  for any pointer change that starts or ends over the painting; the cursor
  shows only while the canvas is the event target (or holds pointer capture,
  as OrbitControls does mid-drag), so the plate keeps its own system cursor,
  and never for touch. There is no control for it.
- Register a mesh/group for normalization with `useWatercolorSubject(ref, id)`.
  Each subject's mesh bounds are evaluated once per repaint, and its world
  matrix once per rendered frame.
- `SurfacePass` saves and restores the renderer's active target, clear color,
  and the scene's `overrideMaterial`, so it stays isolated as the pipeline
  gains new stages.

The Leva panel (`src/dev/usePipelineControls.js`) exposes only live controls,
in folders grouped by what they change in the painting, then the Session:

- **Light**: `position` (shared world-space light); **Diffuse** › `diffuse
  intensity` (flat-to-Lambert); **Specular** › `shininess`, `strength`,
  `threshold` (also sizes the bare-paper highlights; strength 0 removes them).
- **Pigment**: `override` (Color Override on/off), `base color`, `shadow
  color`, `dilution`; **Turbulence** › `intensity` (0–1, 0 = off), `scale`
  (noise cycles per object unit), `octaves` (1–6), `warp` (0 = plain fBm);
  **Granulation** › `intensity` (0–1, 0 = off); **Dry brush** › `amount`
  (0–1, 0 = off), `threshold` (0–1, diffuse level above which it applies),
  `softness` (0.01–0.3, how feathered the bare peaks are), `transition`
  (0.01–0.3, fade width around the threshold);
  **Wetness** › `paint blur` (CSS px, 0–16, 0 = off).
- **Edges**: `darkening` (`k`, 0–5, 0 = off), `width` (edge blur radius, the
  thesis's `W`, CSS px, 0–16); **Detection** › `sobel strength`, `sobel
  radius` (integer source pixels).
- **Substrate**: `color`, `scale`; **Distortion** › `enabled`, `amount` (0–8
  CSS px); **Lighting** › `enabled`, `angle` (degrees, 0 = from the right,
  counter-clockwise; default 120), `strength` (`ds`), `roughness` (`r`). Each
  effect's settings show only while it is enabled.
- **Session**: save, reset to defaults, copy values.

It is presented as **Fig. 1 — the controls** (`src/components/DebugPanel.jsx`)
on the shared figure plate (`src/components/Plate.jsx` + `Plate.css`):
small-caps serif type (Cormorant SC and EB Garamond, loaded in `index.html`)
on a frosted vellum sheet (translucent paper tint plus backdrop blur, so the
ink reads over the painting while it shows through), docked top-right and
holding `<Leva fill flat titleBar={false}>` (no drag or search; the plate's
caption folds it), so it renders in place rather than as Leva's fixed dark
root. The caption title is the fold toggle (a real button with
`aria-expanded`): clicking "Fig. 1 — the controls" folds the plate up under
its caption line, and the small inked tick to the left of the title turns to
point at the folded plate. Folded, the caption drops its bottom gap and rule
so the strip's padding is even above and below the text. The plate collapses
by animating a one-row grid to `0fr` and is `inert` while folded. The folded
state is a per-viewer convenience in `localStorage` under the plate's
`storageKey` (`debug-panel-collapsed`; every access guarded so it defaults to
unfolded when storage is unavailable). Every pigment accent takes the base
pigment deepened toward the ink (`--plate-wash-ink`, on `:root` in
`Plate.css`, from the Color Override base color, which `App` sets as
`--plate-wash` on `<html>`); there is no fixed accent color.
`PLATE_THEME` maps Leva's Stitches tokens onto the plate: clear
`elevation1`/`elevation2` so the vellum shows, a faint ink tint for fields,
ink and ink-soft text, Cormorant SC for folders, and accents (`accent1–3`,
slider fills, focus, checkboxes) built from `var(--plate-wash-ink)` so they
follow the base color live. `DebugPanel.css` reaches what tokens can't with
tag selectors scoped to `.debug-panel` (Leva's classes are hashed): EB
Garamond italic labels, lining tabular figures in inputs, Session buttons as
small-caps caption type, ledger lines (each control row, the div two levels
above its `label`, padded 4px above and below with a faint hairline beneath;
the theme's `rowGap` is 0 so every row is the same height; a section's last
row, directly or in its last subsection, drops its line so only the section
rule shows), a darker hairline between top-level sections (selected through
Stitches' `isRoot-true` variant class, with doubled `.debug-panel` to outrank
Leva's own rule), and folder chevrons repainted as the plate's inked chevron
(Leva's triangle path hidden, the chevron drawn as a CSS mask on the same
svg, so Leva's open/closed rotation still applies). The body scrolls inside
the plate when every folder is open. The panel moves and resizes: dragging
anywhere on its caption row moves it (after 4px, so a plain click on the
title still folds it; the dotted grip also takes arrow keys, 10px, and
double-click re-docks it top-right), and a hatched grip at the bottom-left
corner resizes it, keeping the right edge and top fixed (min 260px wide,
body min 120px). The panel stays inside a 12px inset from the window edge
(on the bottom, enough that the caption stays reachable). `Plate` takes
`style`, `captionProps` (the drag handlers) and a `corner` element (hidden
while folded) for this. The frame `{ left, top, width, bodyHeight }` is a
per-viewer convenience in `localStorage` (`debug-panel-frame`, guarded;
absent = docked), clamped at render so a smaller window never strands the
panel off screen; `--dp-top` keeps the scrolling body above the window bottom
and `--dp-body-height` applies only while unfolded so folding still collapses.

Control keys match the pipeline prop names (e.g. `diffuseAmount`), so each
folder's values spread straight into `MultiPassPipeline`, saved sessions stay
compatible, and reset restores each folder from `DEFAULTS` by key.

## Source layout

- `src/pipeline/MultiPassPipeline.jsx`: the pass mounts, their target refs, and the renderer's `autoClear`.
- `src/pipeline/passes/SubstratePass.jsx`: procedural paper, repainted only when its inputs change.
- `src/pipeline/passes/SurfacePass.jsx`: the one scene render (depth pre-pass, subject depth ranges) into the MRT surface.
- `src/pipeline/passes/SobelPass.jsx`: depth edges in one pass.
- `src/pipeline/passes/EdgeDarkeningPass.jsx`: both separable blurs (merged-pair kernels) and edge darkening.
- `src/pipeline/passes/CompositePass.jsx`: the finished painting: distortion, granulation, dry brush, highlights, paper, lighting.
- `src/pipeline/passes/OutputPass.jsx`: the painting to screen with the cursor, every rendered frame.
- `src/pipeline/PaintingFrame.jsx`: the repaint check, `usePaintFrame`, and on-demand frame requests.
- `src/pipeline/utils/passHooks.js`, `fullscreenQuad.js`: fullscreen-pass scaffolding (no clears; MRT and GLSL3 options).
- `src/pipeline/utils/paintingCursor.js`: mouse tracking and system-cursor hiding for the painted cursor.
- `src/pipeline/utils/viewScale.js`: stage-pixel conversion and the render density cap.
- `src/pipeline/utils/paperZoom.js`: the camera zoom the paper follows.
- `src/components/ContainFit.jsx`, `SmoothZoom.jsx`: short-side camera fit and damped wheel zoom.
- `src/pipeline/WatercolorSubjects.jsx`: registration context and hook.
- `src/shaders/`: one fragment shader per pass, plus `surfaceVertex.vert` and
  the fullscreen vertex; `src/shaders/chunks/` holds the shared OKLab pigment
  concentration, Perlin turbulence, blur axis, and paper slope.
- `src/components/Plate.jsx`: the shared folding figure plate (vellum, caption, fold).
- `src/components/DebugPanel.jsx`: the themed Leva panel (Fig. 1).
- `EXPLAINER.md`: implemented behavior overview.

## Adding the next pass

1. Prefer extending an existing pass: per-pixel geometry signals belong in
   `SurfacePass` (a channel or attachment), per-pixel paint or paper effects in
   the edge-darkening vertical pass or the composite. Add a pass only when the
   effect needs a neighborhood of something not yet in a target.
2. Give a new pass an explicit frame priority and use `usePaintFrame`, not
   `useFrame`; anything new that changes the image over time must make the
   repaint check fire and request a frame. Fullscreen passes must cover their
   whole target (nothing clears for them).
3. Add only live controls; keys match the pipeline prop names.
4. Preserve the neutral empty-pixel/coverage convention. The composite is the
   final painting, so a new signal reaches it only once it is wired into the
   paint layer or `CompositePass` deliberately.
5. Update this file and `EXPLAINER.md`.
6. Run lint/build and visually inspect the output, including orbiting, zoom,
   resize, and the cursor.
