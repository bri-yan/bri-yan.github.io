# AGENTS.md

Keep this file accurate in the same change as any architecture, pass, view,
control, scene graph, asset, or workflow change. Describe implemented behavior
only.

## Project and commands

This project is a real-time watercolor/NPR renderer; its pipeline is the
portfolio piece. `synthesis` is the clean baseline. The main research source
is `resources/Watercolor_Montesdeoca.pdf`; selectively use ideas from
`resources/Watercolor_Luft_Deussen.pdf`. `resources/`, `.claude/`, and
`.pnpm-store/` are ignored local state. Paper textures are research assets,
not runtime inputs. Do not edit or delete the user-owned
`THESIS_CORE_WATERCOLOR_TECHNIQUES.md` unless asked.

```bash
pnpm dev      # Vite server; GLSL changes hot-reload
pnpm build    # production build
pnpm preview  # preview that build
pnpm lint     # ESLint
```

## Rendering pipeline

`MultiPassPipeline` mounts sibling passes in frame-priority order and passes
render targets by ref. The scene data is produced in one MRT target after a
depth pre-pass. The subsequent passes are fullscreen draws:

```text
scene -> SurfacePass -> surface[paint, diffuse, specular, depth, coverage]
surface.depth -> SobelPass -> edges
surface.paint + edges -> EdgeDarkeningPass -> paint
paper -> SubstratePass -> substrate
paint + surface signals + substrate -> CompositePass -> painting
painting + substrate -> OutputPass (cursor) -> screen
```

| Priority | Pass | Runs | Output |
| ---: | --- | --- | --- |
| −0.5 | `PaintingFrameProvider` | every rendered frame | Decides whether the painting is stale. |
| 0 | `SubstratePass` | only when paper inputs change | HalfFloat paper: RGB lit paper, A height. |
| 1 | `SurfacePass` | repaint | HalfFloat MRT: paint and surface data; the only depth buffer. |
| 2 | `SobelPass` | repaint | Premultiplied depth edges. |
| 3 | `EdgeDarkeningPass` | repaint | Two shared blur passes, then straight pigment and density. |
| 4 | `CompositePass` | repaint | Finished opaque, 8-bit `painting`. |
| 5 | `OutputPass` | every rendered frame | Painting and cursor to screen. |

Prioritized `useFrame` callbacks replace R3F's automatic render. The pipeline
sets `gl.autoClear = false`; fullscreen passes cover their targets, and only
`SurfacePass` clears. The screen has no depth buffer or multisampling. There
are no intermediate debug views.

### Repainting and scale

`<Canvas frameloop="demand">` renders only after `invalidate()`. Camera
controls, wheel easing, cursor changes, press easing, resize, and React
updates request frames. `PaintingFrameProvider` runs after camera controls and
before all passes: it compares camera world/projection matrices, registered
subject world matrices, and drawing-buffer size with the last painted state;
provider or pass re-renders also mark it stale. It continues requesting frames
until OrbitControls' residual damping settles. Painting passes use
`usePaintFrame`; their targets retain the previous result on cursor-only
frames. `OutputPass` always runs. Nothing in the painting is time-animated:
new animation must move a tracked matrix or mark paint stale and request a
frame. `SubstratePass` separately caches target size, stage scale, color, and
zoomed paper scale, so orbiting does not regenerate noise.

Image-space lengths called “CSS pixels” in controls are **stage pixels**:
`STAGE_REFERENCE_SIZE` is 800 on the window's short side.
`pixelsPerStageUnit()` is the conversion to device pixels; use it for paper,
blur, and distortion lengths. `useRenderDpr()` caps the rendered short side at
`RENDER_MAX_SHORT_SIDE` (1440), and `ContainFit` frames the subject by the
short side in portrait and landscape. Sobel radius is in source pixels. The
cursor alone uses actual CSS pixels via `gl.getPixelRatio()`; the overlay
plate is also fixed CSS size.

### Render-target and signal contracts

Target options and frame priorities live in `src/config/constants.js`. All
targets share the canvas device-pixel grid (`useFBO`). Ordinary targets are
HalfFloat RGBA with linear filtering and no depth; `surface` and the
horizontal blur each have two attachments. MRT fragment shaders use GLSL3 and
explicit output locations. `painting` is 8-bit with nearest filtering.
`surface` clears to transparent black: empty pixels have zero paint and
coverage. Preserve that convention when adding effects.

- **Substrate:** `substrateFragment.frag` generates cold-press paper from
  gradient-noise fBm, fine grain, and broad drift. RGB includes a soft relief
  light; A is normalized height. Noise is anchored to the screen center in
  stage pixels and scales with `zoomedPaperScale()` (camera zoom times paper
  scale, floored at `MIN_PAPER_SCALE`). It stays fixed on orbit and pan, and
  grows about the center on zoom. Composite and output derive the uphill
  paper slope from central differences of alpha in `paperSlope.glsl`; no
  separate gradient target exists.
- **Surface:** `SurfacePass` first renders the whole scene depth-only, then
  shades visible surfaces with `LessEqual` and no depth writes. Non-subject
  meshes shade with depth −1; each registered subject shades with its own
  normalized view-depth range. The range is computed from transformed mesh
  bounding-box corners, so its extrema are approximate. Materials are
  double-sided and flip normals on back faces. WebGL2 with
  `EXT_color_buffer_float` is required. `surface.textures[0]` stores
  `(pigment × density, density)` premultiplied. `textures[1]` stores
  `(diffuse, specular mask, subject depth, coverage)`; depth is 0–1 on a
  subject, −1 on non-subject geometry. Diffuse is flat-to-Lambert from one
  world-space light; color override mixes shadow/base pigment (off: base
  pigment times diffuse), dilution thins lit paint, and thresholded
  Blinn–Phong sets the specular mask.
  Object-local 3D Perlin fBm turbulence then concentrates or thins pigment
  and density, with optional domain warp; its pattern follows the geometry,
  and intensity 0 passes through.
  Keep `TURBULENCE_MAX_OCTAVES` in sync with the shader's `MAX_OCTAVES`.
- **Edges and paint:** `SobelPass` samples subject depth with 3×3 Sobel
  kernels and writes `(edge × coverage, 0, 0, coverage)`. The two separable
  Gaussian blurs in `EdgeDarkeningPass` process paint and edges together:
  horizontal MRT, then vertical blur and edge darkening. Radii are stage
  pixels (0 passes through); neighboring taps merge into bilinear pairs, with
  `BLUR_MAX_TAPS` and shader `MAX_BLUR_PAIRS` kept in sync. Paint stays
  premultiplied through the blur, then is un-premultiplied into straight RGB
  pigment and A density. Darkening increases density and uses the shared
  OKLab `concentratePigment()` to deepen pigment while preserving hue; a
  strength of 0 passes through.
- **Composite:** `CompositePass` applies, in order, paper-slope distortion,
  granulation, dry brush, specular highlight lift, paint over flat paper
  color, and paper lighting. Distortion samples paint uphill and grows with
  paper zoom. Granulation and dry brush read diffuse, coverage, and paper
  height at the **undistorted** pixel, after the paint blur: valleys gather
  pigment in shadow, while lit peaks lose pigment to bare paper. Dry-brush
  `density = 0` tests the paper's own height. Above 0, it blends toward the
  height relative to eight surrounding taps; the ring shrinks with density,
  has a 1.5-device-pixel minimum, and uses the measured `RING_SPREAD` gain
  to keep coverage comparable. Those extra taps run only when density and
  amount are positive. Granulation intensity 0 and dry-brush amount 0 pass
  through. The specular mask lifts paint to bare paper; final lighting uses
  a normal reconstructed from the slope. Distortion and lighting have
  separate toggles. The paper color is the background; its prelit RGB is
  used only by the cursor, avoiding double lighting in the composite.
- **Output:** `OutputPass` copies `painting` and draws a near-black ink ring
  with a window onto the undistorted substrate RGB. The ring is gently
  displaced by the paper slope and shrinks while pressed. It is sized in
  real CSS pixels and appears only over the canvas (including pointer
  capture), never for touch or over the controls plate. Pointer listeners in
  `paintingCursor.js` hide the system cursor on the canvas and invalidate
  frames as needed.

`SurfacePass` restores the active render target, clear color, and scene
override material after rendering. Keep fullscreen passes isolated in the
same way.

## Views and subjects

`src/views/index.js` registers the selectable views: torus knot (default),
sphere, cube, icosahedron, torus, teapot, and a five-object forms study. Each
view has `{ id, label, camera?, objects }`; camera azimuth/elevation are
degrees, and each object has `{ id, shape, size, proportions?, sides?,
rest?, position?, rotation? }`. Object IDs are unique across views; the
current limit is `MAX_VIEW_OBJECTS` (5). Add views there and primitives in
`src/views/shapes.js`.

`size` is the shape's overall extent in world units. Box proportions are
`[x, y, z]`; prism proportions are `[width, height]`, with `sides` controlling
facets (more than 12 is smooth). Size geometry itself, not `mesh.scale`, so
object-local turbulence has consistent frequency. With `rest`, position.y
is the height of the object's lowest point after rotation. Keep compositions
within roughly 1.5 times their height in width for portrait fit. The forms
study intentionally has screen-space overlap but no 3D intersection with its
central sphere; preserve the sphere/block overlap and small sphere/prism gap.

`ViewScene` mounts only the active view and registers every object with
`useWatercolorSubject(ref, id)` in a layout effect. `App` keys the scene by
the shown view's ID for a clean switch. `ViewCamera` frames only the first view
(at the default camera distance); switching views leaves the camera, controls
target, and zoom untouched, so the painting changes under an unchanged view.
Subject depth is normalized independently per object, so overlap edges can vary
in strength. Register only intentional watercolor subjects; bounds are
evaluated each repaint and world matrices each frame.

### View transition

The Scene `view` control only sets the wanted view; `App` keeps the `shown`
view separately. `ViewTransition` (priority −0.75, before the repaint check)
unpaints the shown painting to bare paper over `VIEW_TRANSITION_SECONDS`, swaps
`shown` to the wanted view, then paints it in over the same time; choosing the
shown view again mid-way reverses. It writes `progress` (0 painted, 1 bare,
eased) to the `TransitionProvider` object (`pipeline/Transition.jsx`), which
`SurfacePass` and `CompositePass` read inside their paint frames, and calls
`useRepaint()` so each step repaints. `progress` is not a prop, so it changes
every frame without re-rendering React. Three effects follow it:

- `compositeFragment.frag` sweeps the dry brush over the whole painting: paper
  height is ranked (`smoothstep(0.25, 0.75, height)`, roughly even) and bare
  where the rank exceeds a cutoff falling from 1 to 0, so peaks go first and
  painting in runs it backwards. The result is `max`ed with the normal dry brush.
  Whatever pigment is left also fades out over the second half of `progress`
  (`TRANSITION_FADE_START`): the last to go are the dark edge rims, which would
  otherwise show as an outline of the shape until the very end, and pop in first
  when painting in.
- `SurfacePass` lowers diffuse intensity by `TRANSITION_DIFFUSE_FALL` and raises
  dilution toward 1 by `TRANSITION_DILUTION_RISE`, so the shading flattens and the
  wash thins as it goes. At `progress` 0 both are the control values exactly.
- With `prefers-reduced-motion`, the view swaps at once.

## Controls and overlay

`src/dev/usePipelineControls.js` groups live Leva controls by effect. Control
keys match `MultiPassPipeline` props; `App` removes the view choice before
passing the rest through.

- **Scene:** view selector, pinned first.
- **Light:** position; Diffuse intensity; Specular shininess, strength,
  threshold.
- **Pigment:** color override, base/shadow colors, dilution; Turbulence
  intensity, scale, octaves, warp; Granulation intensity; Dry brush amount,
  density, threshold, softness, transition; Wetness paint blur.
- **Edges:** darkening, width; Detection Sobel strength and radius.
- **Substrate:** color, scale; independently toggled Distortion amount and
  Lighting angle, strength, roughness.
- **Session:** save, reset to defaults, copy values.

Session actions handle pipeline values only. The selected view is separately
remembered in guarded `localStorage` (`watercolor-view`); unknown IDs fall
back to the default. The controls plate is “Fig. 1 — the controls”: a themed
Leva panel inside the shared vellum `Plate`. Its pigment accents follow the
base color through `--plate-wash`. Its caption folds the panel; the folded
body is inert. The caption drags the panel, its bottom-left grip resizes it,
and double-clicking the caption grip re-docks it. Fold and frame state are
guarded per-viewer `localStorage` conveniences (`debug-panel-collapsed` and
`debug-panel-frame`); the frame is clamped to remain reachable on resize.
Style changes belong in `Plate.css` or `DebugPanel.css`, with Leva overrides
scoped to `.debug-panel`.

## Source map and change workflow

- `src/pipeline/MultiPassPipeline.jsx`, `PaintingFrame.jsx`, and
  `WatercolorSubjects.jsx`: pass wiring, repaint decisions, and subjects.
- `src/pipeline/passes/`: the six passes named above; `utils/passHooks.js` and
  `fullscreenQuad.js` provide fullscreen rendering; `viewScale.js`,
  `paperZoom.js`, and `paintingCursor.js` handle units and input.
- `src/shaders/`: a fragment shader per pass, surface/fullscreen vertices,
  and shared chunks for OKLab, turbulence, blur, and paper slope.
- `src/views/` and `src/components/ViewScene.jsx`, `ViewCamera.jsx`,
  `ViewTransition.jsx`: view registry, primitive geometry, active
  scene/camera, and the unpaint/paint-in switch (`pipeline/Transition.jsx`).
- `src/components/Plate.jsx`, `DebugPanel.jsx`, and `src/dev/`: overlay and
  controls. `EXPLAINER.md` is the reader-facing behavior overview.

When extending the renderer:

1. Prefer an existing pass: geometry signals belong in `SurfacePass`; paint
   and paper effects generally belong in the edge-darkening vertical pass or
   `CompositePass`. Add a pass when a new neighborhood signal needs a target.
2. Give any new pass an explicit frame priority and use `usePaintFrame` for
   painting work. Any animation must update the repaint decision and request
   a frame. Fullscreen passes must cover their entire target.
3. Preserve the target formats, premultiplication, and neutral empty-pixel
   convention. Wire new signals to the composite deliberately.
4. Expose only live controls, with keys matching pipeline props. Update this
   file and `EXPLAINER.md` with the implementation.
5. Run `pnpm lint` and `pnpm build`; inspect orbit, zoom, resize, view
   switching, controls, and the cursor in the browser.
