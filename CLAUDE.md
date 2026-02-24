---
description: 
alwaysApply: false
---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # start dev server
pnpm build      # production build
pnpm preview    # preview production build
pnpm lint       # run ESLint
```

## Architecture

This is a React + Three.js portfolio site that renders a 3D scene using a custom multi-pass watercolor/NPR (non-photorealistic) render pipeline built with `@react-three/fiber`.

### Render Pipeline (`src/pipeline/`)

The core is `MultiPassPipeline` — a React component that wraps any 3D scene content and applies a sequence of render passes, each writing to a WebGL FBO (framebuffer object):

1. **IntensityPass** — renders the scene with an intensity/grayscale shader → FBO
2. **BlurPass** — Gaussian blur of the intensity FBO → FBO (used downstream by FlowPattern and also exposed as `blurRef`)
3. **FlowPatternPass** — watercolor flow/edge effect using blurred intensity + paper texture → FBO
4. **DiffusePass** — Blinn-Phong diffuse lighting render → FBO
5. **BlurPass** (second instance) — blurs the diffuse FBO
6. **SpecularPass** — Blinn-Phong specular highlights → FBO
7. **PaperTexturePass** — loads paper texture from `/dist/textures/paper.jpg` → FBO
8. **CompositorPass** — composites all FBOs into the final screen output with configurable blend mode and per-pass weights

Passes communicate via React `ref`s (e.g. `intensityRef`, `diffuseRef`). Each pass that reads from another gets the upstream ref as a prop. `useFrame` priority ordering (`PASS_FRAME_ORDER`, `FLOW_PATTERN_FRAME_ORDER`, `COMPOSITOR_FRAME_ORDER`) ensures correct execution sequence.

### Key Patterns

- **Scene pass utility** (`pipeline/utils/sceneWithMaterials.js`): `useSceneRenderPass(getMaterial)` is the hook all geometry-based passes use. It clones the main scene, overrides materials, and renders to an FBO each frame. Pass a `cacheKey` (e.g. shader source string) to bust the materials cache on HMR.
- **Fullscreen quad utility** (`pipeline/utils/fullscreenQuad.js`): `createFullscreenQuad` + `renderFullscreenQuad` are used by image-space passes (Blur, FlowPattern, Compositor, Paper).
- **Shaders** (`src/shaders/`): All GLSL is imported as raw strings via Vite's `?raw` import. Each pass imports its own `.vert`/`.frag` files.
- **Config** (`src/config/constants.js`): All tunable parameters (weights, Blinn-Phong constants, blur settings, frame order priorities) are defined here and exported via `src/config/index.js`.

### Adding a New Pass

1. Create `pipeline/passes/MyPass.jsx` — use `useSceneRenderPass` (geometry-based) or `createFullscreenQuad`/`renderFullscreenQuad` (image-space).
2. Add any shaders to `src/shaders/`.
3. Wire the pass into `pipeline/MultiPassPipeline.jsx` with appropriate refs and `useFrame` ordering.
4. Add defaults to `src/config/constants.js` and expose them as props on `MultiPassPipeline`.
