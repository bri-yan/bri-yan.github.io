# The Watercolor Pipeline — A Ground-Up Explainer

> A guided tour of `bri-yan.github.io`: a React + Three.js portfolio whose centerpiece is a
> hand-built, multi-pass **watercolor / non-photorealistic (NPR)** render pipeline.
>
> Read this top-to-bottom and you'll be able to reason about every pixel on screen, know which
> knobs actually do something, and know what's half-finished.

> **State of play:** development happens on the `test` branch, and many of the concrete values
> you'll meet below — pass weights, thresholds, blur counts, the flow-pattern shader math — are
> **temporary testing values**, not settled design. The *architecture* (the passes, the ref graph,
> the priority ordering) is stable; the *numbers* are in flux. When a value here disagrees with
> the code, the code wins — `src/config/constants.js` and `git status` are the source of truth.
> The unmoving target: a real-time watercolor shader. Every knob is live-tunable in the browser
> via the **leva dev panel**, and any pass's raw output can be inspected with the panel's
> **Debug → view** select (§7).

---

## 0. The 60-second version

```
A cyan torus knot is rendered eight different ways into eight offscreen buffers,
then one final shader mashes those buffers together into a watercolor-looking image.
```

That's the whole idea. Everything below is detail on *which* eight buffers, *why* each one
exists, *how* they're sequenced, and *where* the seams currently show.

If you remember only one sentence: **the picture you see is never the 3D scene itself — it's a
2D collage assembled by the final "compositor" shader out of intermediate images.** The scene is
rendered to memory, never to the screen.

---

## 1. Read this first: the two ideas everyone gets wrong

Most confusion with this codebase comes from two wrong assumptions. Name them now and the rest
falls into place.

### Misconception A — "the passes are nested / wrap each other"

They are **not**. An older doc (`PIPELINE_DOCS.md`, since deleted) showed passes nested as
parent/child (`<BlinnPhongPass><BlurPass>…`). That design is gone. Today the passes are **flat
siblings** in a single fragment:

```jsx
<>
  {children}            {/* the actual 3D scene */}
  <PaperTexturePass … />
  <IntensityPass … />
  <BlurPass … />
  <EdgePass … />
  <BodyPass … />
  <DiffusePass … />
  <BlurPass … />
  <SpecularPass … />
  <CompositorPass … />
  <DebugViewPass … />   {/* dev tool — idle unless a debug view is selected */}
</>
```

None of them wrap each other. They don't pass data through React children or context. They
coordinate through two mechanisms only:

1. **React `ref`s** — a pass writes its output framebuffer into `someRef.current`, and a later
   pass reads `someRef.current.texture`.
2. **`useFrame` priority numbers** — these decide the *order* the passes run in each animation
   frame.

So the "pipeline" is a **dataflow graph drawn with refs**, not a component tree. Hold that image.

### Misconception B — "`IntensityPass` computes lighting / brightness"

It does not. Its fragment shader is literally one line:

```glsl
void main() { gl_FragColor = vec4(1.0); }   // pure white, everywhere the mesh covers
```

So the "intensity" buffer is a **silhouette mask**: solid white where the torus knot is, empty
(transparent black) everywhere else. A hard on/off stencil.

Where does the soft, organic watercolor *gradient* come from, then? **From blurring that mask.**
Blur a crisp white-on-black silhouette and you get a smooth ramp: ~1.0 deep inside the shape,
falling to ~0.0 outside, with a feathered band hugging the outline. That manufactured gradient is
the raw material the watercolor-edge shader carves into.

```
IntensityPass            BlurPass                       FlowPatternPass
(silhouette mask)        (mask → smooth ramp)           (ramp → watercolor edge)

   ┌─────────┐             ░▒▓████▓▒░                      smooth threshold band =
   │██████   │   blur      ░▒▓████▓▒░         smoothstep   the wet pigment border
   │████████ │   ────►     ░▒▓████▓▒░         ──────────►  that defines the look
   │  ██████ │             ░▒▓████▓▒░
   └─────────┘             (gradient at edge)
```

This is the single most important insight in the project. The watercolor edge is an **emergent
property of "mask → blur → threshold,"** not something any one shader draws directly.

---

## 2. First principles: how a multi-pass renderer works at all

If you've never written a post-processing pipeline, here's the minimum background. Three concepts.

### 2.1 The framebuffer object (FBO) = "render into memory, not onto the screen"

Normally WebGL draws to the canvas. An **FBO** (a.k.a. render target) is an off-screen image you
can draw into instead, and then *sample like a texture* in a later draw. FBOs are how one pass
hands its result to the next.

In this codebase every FBO is created with `useFBO(width, height, FBO_OPTIONS)` from drei, sized
to the canvas, `RGBA`, linear-filtered. Each pass owns its own FBO(s).

### 2.2 The fullscreen quad = "run a shader once per screen pixel"

Some passes don't draw 3D geometry — they take an input image and transform it (blur, threshold,
composite). The trick is to draw a flat rectangle that exactly fills the screen, with an
orthographic camera, so the fragment shader runs once per output pixel. That's a **fullscreen
quad**, and `pipeline/utils/fullscreenQuad.js` builds one (`createFullscreenQuad` / `renderFullscreenQuad`).

### 2.3 Two archetypes of pass

Every pass in this project is one of exactly two kinds. Internalize this and the `passes/` folder
stops looking like nine unrelated files.

| Archetype | What it does | Helper it uses | Passes |
|---|---|---|---|
| **Geometry pass** | Re-renders the *3D scene* with a swapped-in shader material → FBO | `useSceneRenderPass(getMaterial)` | Intensity, Diffuse, Specular |
| **Image-space pass** | Reads input FBO texture(s), runs a fragment shader on a fullscreen quad → FBO (or screen) | `useFullscreenPass` + `useUniformSync` (`utils/passHooks.js`, wrapping the quad helpers) | Blur*, Edge, Body, Paper, Compositor, DebugView |

\* BlurPass keeps a bespoke two-material ping-pong on the lower-level `createFullscreenQuad` /
`renderFullscreenQuad` helpers directly.

A **geometry pass** clones the scene, replaces every mesh's material with a custom
`ShaderMaterial`, and renders it — so it sees the real 3D shape but shades it however it wants. An
**image-space pass** never touches 3D; it just does math on pixels of an existing image.

---

## 3. Project structure — the file map

```
bri-yan.github.io/
├── index.html                  Vite entry; mounts #root
├── vite.config.js              React-SWC plugin, nothing exotic
├── package.json                react 19, three 0.182, @react-three/{fiber,drei}, leva
├── CLAUDE.md                   instructions for AI assistants (condensed version of this doc)
├── EXPLAINER.md                this document
├── public/textures/            paper.jpg — the grain texture (served at /textures/paper.jpg);
│                               paper_{original,normalized}.jpg are unused source variants
│
└── src/
    ├── main.jsx                React root (StrictMode) → <App/>
    ├── App.jsx                 <Leva/> + <Canvas> + <MultiPassPipeline {...controls}> + scene
    │
    ├── config/
    │   ├── constants.js        ★ every tunable number + priority lives here
    │   └── index.js            re-exports constants
    │
    ├── dev/
    │   └── usePipelineControls.js   the leva dev panel: every knob, debug views, save/reset
    │
    ├── components/             the 3D *content* (not the pipeline) + HUD
    │   ├── TorusKnotScene.jsx  the mesh currently on screen
    │   ├── TorusScene.jsx      alternate scene (unused)
    │   └── PipelineDiagram.jsx (+ .css)  clickable pipeline schematic overlay (probes debug views)
    │
    ├── pipeline/
    │   ├── MultiPassPipeline.jsx   ★ wires every pass + the `fbos` ref map together
    │   ├── passes/                 one file per pass, incl. DebugViewPass (see §5)
    │   └── utils/
    │       ├── sceneWithMaterials.js   useSceneRenderPass (geometry passes)
    │       ├── passHooks.js            useFullscreenPass + useUniformSync (image-space passes)
    │       └── fullscreenQuad.js       low-level quad helpers (used by passHooks + BlurPass)
    │
    └── shaders/                  raw GLSL, imported as strings via `?raw`
        ├── chunks/common.glsl       shared helpers (rgbIntensity), prepended via string concat
        ├── fullscreenVertex.vert    passthrough vert for quad passes
        ├── lightingVertex.vert      view-space normal/position for lighting passes
        ├── intensityFragment.frag   `vec4(1.0)` — the silhouette
        ├── blur.frag                9-tap separable Gaussian, direction-parameterized (uDirection)
        ├── diffuseFragment.frag     inverse Lambert → alpha
        ├── specularFragment.frag    Blinn-Phong specular → hard mask
        ├── edgeFragment.frag        ★ the wet-front rim, dried into the paper
        ├── bodyFragment.frag        ★ the clean interior wash
        ├── paperTextureFragment.frag  RGB→alpha repackaging of paper
        ├── debugViewFragment.frag   blit any FBO to screen (rgb / alpha / rgb×a)
        └── compositorFragment.frag  ★ the final collage
```

The `★` files are the ones to read first. (The former trap files — stale `PIPELINE_DOCS.md`, dead
`DiffuseBlurPass.jsx` + `useGaussianBlur.js`, broken `archived/` — were deleted in the 2026-07
cleanup; git history has them if ever needed.)

---

## 4. The execution model — what happens in one frame

Before the pass-by-pass tour, understand the clock. **This is the part that makes the dataflow
graph actually resolve correctly.**

### 4.1 `useFrame(callback, priority)` orders everything

`@react-three/fiber` calls every registered `useFrame` callback once per frame, **sorted by
priority ascending** (ties broken by mount order). The project uses these priorities (from
`config/constants.js`):

| Priority | Who | Purpose |
|---:|---|---|
| `-1` (`UNIFORM_SYNC_FRAME_ORDER`) | every pass's uniform-sync callback | push the latest prop values into shader uniforms |
| `1` (`PASS_FRAME_ORDER`) | Paper, Intensity, Blur×2, Diffuse, Specular | render the source FBOs |
| `1.5` (`PAINT_FRAME_ORDER`) | Edge, Body | need the blur, which finished at `1` |
| `2` (`COMPOSITOR_FRAME_ORDER`) | Compositor | needs *everything*, draws to screen |
| `3` (`DEBUG_VIEW_FRAME_ORDER`) | DebugView | dev tool: when a debug view is selected, overwrites the screen with that pass's FBO |

> **Crucial side effect:** the moment *any* `useFrame` declares a priority, R3F switches off its
> automatic scene render. So the scene is **never auto-drawn to the canvas**. The compositor's
> fullscreen-quad draw (to `target = null`, i.e. the screen) is the only regular draw that hits
> your display — and when a debug view is active, DebugViewPass draws over it one slot later. The
> background you see outside the silhouette is the compositor's `uBackgroundColor` (white by
> default, live in the panel), not anything from the 3D scene.

### 4.2 The ref handshake

Each pass assigns its FBO into a ref *during render* (`if (outputRef) outputRef.current = target`),
so the wiring exists before the first frame. Then *during* the frame, at its priority slot, the
pass fills that FBO with pixels and later passes read `ref.current.texture`. Because priorities
order the writers before the readers, every dependency is satisfied **within the same frame** — no
one-frame lag.

In `MultiPassPipeline` all of these refs live in a single `fbos` map (`fbos.intensity`,
`fbos.blur`, `fbos.flowPattern`, …). The keys double as the panel's debug-view names
(`DEBUG_VIEWS` in config), which is how DebugViewPass can show any of them for free.

### 4.3 The frame timeline (follow the torus knot through it)

```
─── priority -1 ───────────────────────────────────────────────────────────
   all passes copy current props → uniforms (colors, weights, strengths…)

─── priority 1 (in mount order) ────────────────────────────────────────────
   PaperTexturePass : sample paper.jpg, pack length(rgb) into alpha    → fbos.paper
   IntensityPass    : render knot as solid white on transparent        → fbos.intensity
   BlurPass #1      : blur intensity 5× (H+V each)                     → fbos.blur
   DiffusePass      : render knot with inverse Lambert → alpha         → fbos.diffuse
   BlurPass #2      : blur diffuse 5×                                  → fbos.diffuseBlur
   SpecularPass     : render knot, hard Blinn-Phong highlight mask     → fbos.specular

─── priority 1.5 ───────────────────────────────────────────────────────────
   EdgePass         : fbos.blur + fbos.paper → paper-dried rim         → fbos.edge
   BodyPass         : fbos.blur + fbos.paper → clean interior wash     → fbos.body

─── priority 2 ─────────────────────────────────────────────────────────────
   CompositorPass   : (edge + body) × (diffuseBlur.a × diffuseGain),
                      punch in specular, composite over background      → SCREEN

─── priority 3 (only when a debug view is selected) ────────────────────────
   DebugViewPass    : blit the chosen pass FBO (rgb / alpha / rgb×a)    → SCREEN
```

Note `BlurPass #1` reads `fbos.intensity`, which `IntensityPass` filled *earlier in the same
priority-1 slot* (it mounts first). Same for Diffuse → BlurPass #2. The mount order in
`MultiPassPipeline.jsx` is load-bearing.

---

## 5. The passes, one by one

Now the detail. For each: what goes in, what comes out, and the actual math.

### 5.1 PaperTexturePass → `paperRef`

**Type:** image-space. **Shader:** `paperTextureFragment.frag`.

Loads `public/textures/paper.jpg`, tiles it by `uRepeat`, and **repackages it**: it keeps the RGB
paper color and writes `length(rgb)/√3` (the normalized brightness) into the **alpha** channel.

```glsl
vec3 rgb = texture2D(tPaper, vUv * uRepeat).rgb;
float alpha = length(rgb) / sqrt(3.0);   // 0 = dark groove, 1 = bright ridge
gl_FragColor = vec4(rgb, alpha);
```

So `paperRef` is "paper color in RGB, paper height/grain in A." Downstream, only the grain matters:
it's what makes the watercolor edge ragged and the fill grainy instead of plasticky-smooth.

### 5.2 IntensityPass → `intensityRef`

**Type:** geometry. **Shader:** `intensityFragment.frag` = `vec4(1.0)`.

Renders the scene with an all-white material. Result: **white silhouette on transparent black.**
That's it. (See Misconception B — this is the seed the watercolor look grows from.) Reuses
`fullscreenVertex.vert` as its vertex shader, which is fine because it doesn't need normals.

### 5.3 BlurPass (#1, on intensity) → `blurRef`

**Type:** image-space. **Shader:** `blur.frag` — one direction-parameterized 1-D pass
(`uDirection` = (1,0) horizontal / (0,1) vertical), run twice per iteration.

A **separable 9-tap Gaussian**: blur horizontally, then vertically (2 cheap 1-D passes instead of
one expensive 2-D pass). One "iteration" = one H + one V. It loops `blurIterations` times (default
**5**), each iteration widening the blur. `blurStrength` scales the per-tap pixel offset.

This is the pass that converts the hard silhouette into the smooth interior-to-edge ramp.
`fbos.blur` is consumed by both paint passes (Edge, Body) **and** is wired into the compositor
as a standalone additive term (`blurWeight`, live in the panel, default `0`).

### 5.4 The paint passes: BodyPass → `fbos.body` + EdgePass → `fbos.edge`  ★ the watercolor

**Type:** both image-space. **Shaders:** `bodyFragment.frag` / `edgeFragment.frag` (each prepended
with `chunks/common.glsl` for `rgbIntensity`). **Inputs:** both read `fbos.blur` (as `tIntensity`)
+ `fbos.paper` (as `tPaper`) and share the Paint knobs (`uBaseColor`, `uThreshold`, `uWetness`).
This is the heart, and where iteration happens.

Both start the same way — carve a `shape` out of the blurred ramp:

```glsl
float intensity = rgbIntensity(texture2D(tIntensity, vUv).rgb); // the blurred ramp
float paper     = rgbIntensity(texture2D(tPaper, vUv).rgb);     // paper relief
float paperOffset = (paper - 0.5) * 2.0;                        // −1 valleys … +1 ridges

float lo = max(0.0, uThreshold - uWetness);
float hi = min(1.0, uThreshold + uWetness);
float shape = smoothstep(lo, hi, intensity);
```

**BodyPass** is the clean interior wash — the shape itself, with opt-in grain
(`uPaperWeight`, default `0` = perfectly flat):

```glsl
float body = clamp(shape * (1.0 + uPaperWeight * paperOffset), 0.0, 1.0);
gl_FragColor = vec4(body * uBaseColor, body);   // premultiplied + coverage
```

**EdgePass** is the wet-front rim, dried into the paper relief in two steps:

```glsl
// (1) the wet front snags on the relief: paper shifts the ramp, gated by
// (1 − shape) so the perturbation can never speckle the interior
float snag = paperOffset * uEdgePaperWeight * EDGE_SNAG_SCALE * (1.0 - shape);
float edgeShape = smoothstep(lo, hi, intensity + snag);
float edge = step(EDGE_MASK_CUTOFF, shape) * (1.0 - edgeShape) * EDGE_GAIN;

// (2) drying: pigment survives in the valleys, breaks on the ridges;
// uEdgeSharpness sets the cut contrast (80 ≈ near-binary ribs)
float halfBand = 0.5 / max(uEdgeSharpness, 1.0);
edge *= 1.0 - uEdgePaperWeight * smoothstep(0.5 - halfBand, 0.5 + halfBand, paper);
```

(`EDGE_GAIN = 3.0`, `EDGE_MASK_CUTOFF = 0.2`, `EDGE_SNAG_SCALE = 0.5` — named consts at the top
of the shader.) Inspect either layer live via **Debug → view → `body` / `edge`**. One reserved
uniform each — `uBaseOpacity` (body), `uEdgeDarkness` (edge) — is plumbed but **unused**.

> **A physically-motivated rewrite was prototyped and reverted** (2026-07). Its recipe, preserved
> for when the experiment resumes: (1) paper perturbs the ramp *before* thresholding
> (`intensity += (paperIntensity−0.5)·2 · κ_θ`) so the border turns ragged; (2) `shape =
> smoothstep(threshold ± wetness, intensity)` is the wet edge; (3) granulation — `shape × (1 +
> κ·paperOffset)` — adds grain inside the fill; (4) edge darkening — `alpha ×= 1 +
> uEdgeDarkness·(1−shape)`, with the color darkened by the same factor — pools pigment at the rim.
> Steps 1–4 map to the ragged-edge / granulation / edge-darkening effects from the academic
> watercolor-rendering paper the original shader comments cited.

### 5.5 DiffusePass → `diffuseRef`, then BlurPass (#2) → `diffuseBlurRef`

**Type:** geometry. **Shaders:** `lightingVertex.vert` + `diffuseFragment.frag`.

Renders the knot with **ambient + Lambertian diffuse**, but note the twist — it stores the
*inverse* in alpha:

```glsl
float diff   = max(dot(normal, lightDir), 0.0);
float result = ambient + diffuseStrength * diff;
result = 1.0 - result;                 // ← inverted!
gl_FragColor = vec4(uBaseColor * result, result);
```

So `diffuse.a` is **low where the surface faces the light** and **high in shadow**. It's used later
as a *shading multiplier* on the watercolor (§6). Then **BlurPass #2** softens it into
`diffuseBlurRef` so the shading reads like a soft watercolor wash, not a hard lit surface.

### 5.6 SpecularPass → `specularRef`

**Type:** geometry. **Shaders:** `lightingVertex.vert` + `specularFragment.frag`.

Blinn-Phong specular, then **hard-thresholded** to pure on/off:

```glsl
float spec = pow(max(dot(normal, halfwayDir), 0.0), uShininess);
float result = (uSpecularStrength * spec) > uSpecularThreshold ? 1.0 : 0.0;
gl_FragColor = vec4(result);   // 1 = highlight pixel, 0 = not
```

So `specularRef` is a crisp white highlight stencil. The compositor uses it to **punch bright white
specular dots** straight through the watercolor for a wet, glossy pop.

### 5.7 CompositorPass → screen  ★ the collage

Covered in its own section because it's where the look is finalized — and where the architecture
currently cuts corners. See §6.

---

## 6. The compositor — where it all comes together

`compositorFragment.frag` receives five textures plus weights — all live in the panel:

```glsl
vec4 edge    = texture2D(tEdge, vUv) * uEdgeWeight;
vec4 body    = texture2D(tBody, vUv) * uBodyWeight;
vec4 diffuse = texture2D(tDiffuse, vUv) * uDiffuseWeight;   // the BLURRED diffuse
vec4 blur    = texture2D(tBlur, vUv) * uBlurWeight;         // default weight 0
float specularMask = texture2D(tSpecular, vUv).a;           // sampled unweighted

vec4 paint = clamp(edge + body, 0.0, 1.0);                  // rim over wash, capped
vec4 result = paint * diffuse.a * uDiffuseGain + blur;
if (specularMask > 0.5) result = vec4(uSpecularWeight);

result = clamp(result, 0.0, 1.0);
gl_FragColor = vec4(result.rgb + uBackgroundColor * (1.0 - result.a), 1.0);
```

Read in English:

1. Assemble the **paint**: the edge layer over the body layer, each with its own weight, capped
   so overlaps don't bloom when shaded.
2. Multiply it by the **blurred inverse-diffuse alpha × `uDiffuseGain`** (default `2.5`) — dim it
   toward the lit side, keep it bright in shadow: a stylized, deliberately non-physical shading
   wash. The gain rescales `diffuse.a` (which tops out near 0.5) back toward 1.
3. Add the standalone `blur` term — off by default (`blurWeight` 0), there for experiments.
4. Wherever the **specular stencil** is on, replace the pixel with `vec4(uSpecularWeight)` — solid
   white at the default weight. The mask is sampled *unweighted* and compared with `> 0.5`, so
   changing the weight dims the highlights instead of silently deleting them.
5. Composite over **`uBackgroundColor`** and write opaque. The paint layers' rgb is
   premultiplied, so the correct blend is `rgb + bg × (1 − a)`. The white default reproduces the
   site's earlier look, when the canvas was transparent and the white page showed through.

History note: this shader used to hardcode the `2.5` gain, ignore its own `blendMode` /
`backgroundColor` uniforms, and rely on a fragile `specular.a == 1.0` exact compare. The dead
blend-mode API was **removed** in the 2026-07 cleanup rather than implemented — if blend modes
come back, design them on purpose instead of resurrecting the old stubs (git history has them).

---

## 7. Configuration & the tuning knobs (a.k.a. the dev panel)

Defaults live in `src/config/constants.js`; at runtime every knob is exposed by the **leva dev
panel** (`src/dev/usePipelineControls.js`). `App.jsx` calls the hook and spreads the result into
`<MultiPassPipeline {...controls}>`; each pass syncs props → uniforms at priority `-1`, so
dragging a slider changes the very next frame. The panel folders map 1:1 to the table below.
To make a tuned value permanent, copy it back into `constants.js`.

**The Debug folder is the pass inspector.** `view` switches the screen from `final` to any single
pass's raw FBO (`intensity`, `blur`, `flowPattern`, `diffuse`, `diffuseBlur`, `specular`,
`paper`); `channel` shows `rgb`, `alpha` (as grayscale), or `rgb*a`. The alpha view matters —
diffuse (inverse-light wash), specular (the stencil), and paper (the grain) all carry their
signal in alpha. The **pipeline diagram** (top-left overlay, `components/PipelineDiagram.jsx`)
drives the same state: click a pass node to probe it, click again / click out / press Escape /
click `final` to return. Its wires show the live compositor weights; a zero-weight wire renders
dashed.

**The Session folder controls persistence.** Values start from `constants.js` defaults (or your
last save). `save` writes the current values to localStorage so they survive refresh; `reset to
defaults` restores the constants and clears the save; `copy values` puts the values JSON on the
clipboard for baking into `constants.js`. Nothing persists unless you explicitly save; the debug
view/channel are never persisted.

| Knob (panel name) | Default | Effect |
|---|---|---|
| Flow Pattern → `baseColor` | `#00ffff` | the pigment color |
| Flow Pattern → `threshold` | `0.3` | where the wet edge sits on the ramp (smaller = fatter shape) |
| Flow Pattern → `wetness` | `0.7` | half-width of the smoothstep band (bigger = softer). Bounds clamp to [0,1], so at wetness `0.7` every threshold ≤ `0.6` looks identical |
| Flow Pattern → `paperWeight` | `0.1` | mild grain on the **fill** only |
| Flow Pattern → `edgePaperWeight` | `0.6` | how much the **edge** dries into the paper grain (0 = smooth rim) |
| Flow Pattern → `edgeSharpness` | `80` | contrast of the edge's valley/ridge drying cut (low = soft, high = crisp ribs) |
| Flow Pattern → `edgeDarkness` / `baseOpacity` | `0.3` / `1.0` | ⚠️ **reserved** — plumbed to the shader but unused by the current `main()` (§5.4) |
| Blur → `iterations` / `strength` | `5` / `1.0` | how soft the silhouette ramp (and diffuse wash) get |
| Lighting → `lightPosition`, `shininess`, `ambientStrength`, `diffuseStrength`, `specularStrength`, `specularThreshold` | `[5,5,5]`, `32`, `0.5`, `0.5`, `0.7`, `0.3` | Blinn-Phong inputs for the diffuse wash + specular stencil |
| Compositor → `flowPatternWeight` / `diffuseWeight` / `blurWeight` | `1` / `1` / `0` | per-layer gains in the composite (§6) |
| Compositor → `specularWeight` | `1.0` | brightness of the punched-in highlights |
| Compositor → `diffuseGain` | `2.5` | rescales the inverse-light wash toward full brightness |
| Compositor → `backgroundColor` | `#ffffff` | what the collage is composited over |
| Paper → `repeatX` / `repeatY` | `1` / `1` | paper texture tiling |

When you go to tune the look, start with `threshold`, `wetness`, `paperWeight`, and the blur
iterations — and keep **Debug → view** on `flowPattern` to watch the raw watercolor while you
drag.

---

## 8. The geometry-pass engine (`useSceneRenderPass`)

Three passes (Intensity, Diffuse, Specular) need to re-render the *real 3D scene* with a different
material. They all share one hook, `pipeline/utils/sceneWithMaterials.js`:

```js
useFrame(() => {
  populateSceneWithClonedMeshes(scene, customScene, getMaterial, materialsCache.current);
  // save clear color → render customScene into the FBO → restore clear color
}, PASS_FRAME_ORDER);
```

- It keeps a **separate `THREE.Scene`** (`customScene`) and, each frame, repopulates it with clones
  of every mesh in the real scene, swapping each mesh's material for one from `getMaterial`.
- **Materials are cached** per mesh UUID (so the shader compiles once). A `cacheKey` (the shader
  source string) busts the cache on hot-reload so editing GLSL updates live.
- It renders `customScene` to the pass's FBO with the shared scene camera, then restores GL state.

This is also where a real **performance cost** hides: the *mesh clones* are rebuilt every frame
(`child.clone()` + clearing `customScene.children`), not just the materials. For one torus knot
it's invisible; for a heavy scene it would matter (see §9).

---

## 9. What's rough / what needs fixing

An honest punch-list. Most of the original list was resolved in the 2026-07 cleanup — stale
`PIPELINE_DOCS.md` and the dead `DiffuseBlurPass` / `useGaussianBlur` / `archived/` files were
deleted, and the compositor's knobs were made real (§6). What remains:

**Rendering correctness nits**
- **Lighting space is inconsistent.** `lightingVertex.vert` outputs `vViewPosition = -mvPosition.xyz`
  (negated view-space position), then the fragment shaders do `normalize(uLightPosition - vViewPosition)`
  — mixing a constant world-ish light `[5,5,5]` with a negated view position. It *looks* fine but
  isn't a correct view-space light. If lighting ever needs to be trustworthy, fix the spaces.
- `uEdgeDarkness` and `uBaseOpacity` are **reserved no-ops** in the current flow shader (§5.4).
  Intentional — but easy to mistake for working knobs when tuning in the panel.

**Performance**
- Geometry passes re-clone the scene every frame (§8). Cache the clones; only update uniforms.
- The scene is rendered 3× per frame (intensity/diffuse/specular) plus ~20 fullscreen-quad draws
  for the two 5-iteration blurs. Fine for one mesh; revisit if the scene grows.
- The leva panel currently ships in the production bundle. Fine while the site is unshipped;
  gate it behind `import.meta.env.DEV` (or a `?debug` query param) before publishing.

**Product-level**
- Torus knot rotation speeds are `0` — it's **static**; only the orbit camera moves.
- There is **no deploy pipeline**: no `.github/workflows`, no `CNAME`, and `dist/` is gitignored.
  For a `*.github.io` repo that means it isn't actually publishing yet.

---

## 10. Where this is going (the "future" section)

This is a **portfolio site** whose thesis is "the render pipeline *is* the portfolio piece." The
engine is ~80% there; the product around it is ~10% there. A sensible arc:

1. **Land the watercolor look.** Iterate `flowPatternFragment.frag` with the dev panel + debug
   views (the reserved uniforms are waiting for the physically-motivated experiment to resume,
   §5.4) until the look is right, then bake the winning values into `constants.js`.
2. **Foundation** — mostly done in the 2026-07 cleanup (dead files deleted, compositor finished,
   shared pass hooks extracted). Remaining item: reconcile the lighting space (§9).
3. **Make it a site.** Add the actual portfolio content/UI (the `SceneOverlay` is a stub for this),
   probably HTML/React layered over the canvas. Decide whether the 3D model becomes *you* —
   swapping the torus knot for real geometry (a bust, a logo, text) is a one-line scene change
   thanks to the geometry-pass abstraction.
4. **Ship it.** Add a GitHub Pages deploy (Action or `gh-pages`), un-ignore or publish `dist/`,
   set a `CNAME` if using a custom domain.
5. **Perf pass, only if needed.** Cache scene clones; consider MRT to render intensity+diffuse+specular
   in one geometry pass instead of three.

---

## 11. How to actually work on it

```bash
pnpm dev        # http://localhost:5173, hot-reloads GLSL edits live
pnpm build      # production build into dist/ (gitignored)
pnpm preview    # serve the built dist/
pnpm lint       # eslint
```

**Where to start reading:** `App.jsx` → `pipeline/MultiPassPipeline.jsx` (the wiring) →
`shaders/flowPatternFragment.frag` (the look) → `shaders/compositorFragment.frag` (the collage).

**To change the pigment / look:** use the leva panel in the browser (`pnpm dev`) — every knob is
live, and **Debug → view** lets you watch any pass's raw output while you drag. Persist values you
like by copying them into `config/constants.js`.

**To change the 3D object:** edit/replace `components/TorusKnotScene.jsx` and swap it in `App.jsx`.
Every geometry pass automatically picks up the new mesh — that's the whole point of the
`useSceneRenderPass` abstraction.

**To add a new pass (the recipe):**
1. Create `pipeline/passes/MyPass.jsx`. Pick your archetype: `useSceneRenderPass(getMaterial)` for
   a geometry pass, or `useFullscreenPass(frag, makeUniforms)` (+ `useUniformSync` for its knobs)
   for an image-space pass.
2. Add its GLSL to `shaders/` (import with `?raw`).
3. Add a key to the `fbos` map in `MultiPassPipeline.jsx`, mount the pass in the right spot, and
   give its `useFrame` a priority that lands **after** its inputs and **before** its consumers.
   Add the same key to `DEBUG_VIEWS` in constants and the panel can inspect it immediately.
4. Add defaults to `config/constants.js`, expose them as props, and register them in
   `dev/usePipelineControls.js` so they show up in the panel.

If you internalize §1 (flat ref-graph, not a tree; mask→blur→threshold makes the watercolor) and
§4 (priority ordering resolves the graph in one frame), the rest of the codebase is just careful
bookkeeping around those two ideas.
