---
description: 
alwaysApply: false
---

# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # start dev server (GLSL edits hot-reload live)
pnpm build      # production build
pnpm preview    # preview production build
pnpm lint       # run ESLint
```

## Project status — read this first

The end product is a **real-time watercolor/NPR shader**; the render pipeline itself is the portfolio piece. The *architecture* described below is stable, but the *specific numbers are not*: pass weights, thresholds, and parts of the shader math are temporary testing values that get tweaked between sessions — usually via the in-browser dev panel (below). Do not treat current constants or the current visual output as settled design intent.

Docs map:
- `EXPLAINER.md` — ground-up explainer of the whole pipeline. Read it before any non-trivial pipeline work.
- `src/README.md` — brief source-layout notes.

## Dev console & pass debugging

- `src/dev/usePipelineControls.js` is a **leva** panel hook exposing every pipeline tunable (flow-pattern knobs, blur, lighting, compositor weights, paper repeat), initialized from `config/constants.js` **or the last saved state**. `App.jsx` spreads its return value into `<MultiPassPipeline {...controls}>`; the per-frame uniform sync makes every control live. The hook also returns `setDebugView` for external debug-view control.
- **Session folder:** `save` persists the current values to localStorage (`watercolor-pipeline-controls`) so they survive refresh; `reset to defaults` restores `constants.js` values and clears the save; `copy values` puts the values JSON on the clipboard. Values only persist when explicitly saved.
- The panel's **Debug → view** select switches the screen to any single pass's raw FBO (`intensity`, `blur`, `edge`, `body`, `diffuse`, `diffuseBlur`, `specular`, `paper`); **Debug → channel** shows `rgb`, `alpha` (as grayscale), or `rgb*a` — several passes carry their meaning in alpha (diffuse's inverse-light wash, specular's mask, paper's grain). Implemented by `DebugViewPass`, which runs after the compositor and overrides the screen when a view other than `final` is selected.
- `src/components/PipelineDiagram.jsx` is a clickable SVG schematic of the pipeline (top-left overlay): clicking a pass node "probes" it (drives the same leva debug view — panel and diagram stay in sync); click again / click out / press Escape / click `final` to return to the composite. Wires into the compositor show live weight badges; a zero weight renders its wire dashed. Node keys come from `DEBUG_VIEWS` — add new passes there and the diagram's `NODES`/`EDGES` tables.

## Architecture

React + Three.js site rendering a 3D scene through a custom multi-pass watercolor pipeline built on `@react-three/fiber`.

### Render Pipeline (`src/pipeline/`)

`MultiPassPipeline` wraps the 3D scene content and mounts a **flat list of sibling pass components** — passes are not nested and don't communicate through children/context. They coordinate via (a) the `fbos` ref map (one FBO ref per pass; keys double as debug-view names in `DEBUG_VIEWS`) and (b) `useFrame` priority numbers ordering execution within a frame. Because every pass registers a prioritized `useFrame`, R3F's automatic scene render is disabled: **only CompositorPass (or DebugViewPass, when active) ever draws to the screen**.

Per-frame execution order (priority constants in `src/config/constants.js`; equal priorities run in mount order, and that mount order is load-bearing):

| Priority | Pass | Output ref |
|---|---|---|
| `-1` (UNIFORM_SYNC) | every pass syncs props → uniforms | — |
| `1` | **PaperTexturePass** — tiles `paper.jpg`, packs brightness into alpha | `fbos.paper` |
| `1` | **IntensityPass** — scene as a solid-white silhouette mask (`vec4(1.0)`) | `fbos.intensity` |
| `1` | **BlurPass #1** — separable Gaussian; turns the silhouette into a soft ramp | `fbos.blur` |
| `1` | **DiffusePass** — *inverted* Lambert shading (alpha high in shadow) | `fbos.diffuse` |
| `1` | **BlurPass #2** — blurs the diffuse into a soft wash | `fbos.diffuseBlur` |
| `1` | **SpecularPass** — hard-thresholded Blinn-Phong highlight stencil | `fbos.specular` |
| `1.5` (PAINT) | **EdgePass** — wet-front rim carved from the blurred silhouette, dried into the paper relief | `fbos.edge` |
| `1.5` (PAINT) | **BodyPass** — clean interior wash from the same ramp, optional paper grain | `fbos.body` |
| `2` | **CompositorPass** — combines the FBOs over the background color → **screen** | — |
| `3` | **DebugViewPass** — dev tool; when active, blits a chosen pass FBO → **screen** | — |

The watercolor look is emergent from **mask → blur → threshold**: IntensityPass makes a hard silhouette, BlurPass converts it to a gradient ramp, and the two paint passes threshold that ramp — BodyPass into the clean interior wash, EdgePass into the paper-dried rim. Both share the Paint knobs (`baseColor`, `threshold`, `wetness`). No single shader "draws" the watercolor.

**Compositor semantics** (`compositorFragment.frag`): `paint = clamp(edge·edgeWeight + body·bodyWeight)`; `result = paint × (diffuse.a·diffuseWeight) × diffuseGain + blur·blurWeight`; where the raw specular mask is on, `result = vec4(specularWeight)`; finally the (premultiplied) result is composited over `uBackgroundColor` and written opaque. All of these knobs are live in the panel. The white default background reproduces the page-through-transparent-canvas look the site had before the compositor became opaque.

### Key Patterns

- **Two pass archetypes.** Geometry passes (Intensity, Diffuse, Specular) re-render the real scene with a swapped-in `ShaderMaterial` via `useSceneRenderPass(getMaterial, cacheKey)` (`pipeline/utils/sceneWithMaterials.js`; `cacheKey` = shader source, busts the materials cache on HMR). Image-space passes (Blur, Edge, Body, Paper, Compositor, DebugView) run a fragment shader over a fullscreen quad.
- **Shared pass hooks** (`pipeline/utils/passHooks.js`): `useFullscreenPass(frag, makeUniforms, { offscreen })` bundles the FBO + material + quad + `render()` for image-space passes (`offscreen: false` for to-screen passes); `useUniformSync(uniforms, getValues)` is the standard props→uniforms sync at priority `-1`. BlurPass keeps a bespoke ping-pong on the lower-level `createFullscreenQuad`/`renderFullscreenQuad` (`pipeline/utils/fullscreenQuad.js`), running one direction-parameterized shader (`blur.frag`, `uDirection`) twice per iteration.
- **Shaders** (`src/shaders/`): all GLSL imported as raw strings via Vite's `?raw` import. Shared helpers live in `src/shaders/chunks/common.glsl` (`rgbIntensity`) and are prepended via string concat in the pass modules. Per-shader magic numbers are named `const`s at the top of the file.
- **Config** (`src/config/constants.js`): every default and priority lives here, exported via `src/config/index.js`.
- **Reserved uniforms:** `uEdgeDarkness` (EdgePass) and `uBaseOpacity` (BodyPass) are plumbed and shown in the panel but not yet used by the shaders — reserved for in-progress work. Don't strip them.
- **Paper texture** loads from `/textures/paper.jpg` (served out of `public/textures/`).

### Adding a New Pass

1. Create `pipeline/passes/MyPass.jsx` — pick an archetype: `useSceneRenderPass(getMaterial)` (geometry) or `useFullscreenPass(frag, makeUniforms)` (image-space).
2. Add its GLSL to `src/shaders/` (import with `?raw`).
3. Wire it into `pipeline/MultiPassPipeline.jsx`: add a key to the `fbos` map, mount it with a `useFrame` priority **after** its inputs and **before** its consumers, and add the key to `DEBUG_VIEWS` in constants to get panel debugging for free.
4. Add defaults to `src/config/constants.js` and expose them as props on `MultiPassPipeline` (and in `src/dev/usePipelineControls.js` if tunable).
