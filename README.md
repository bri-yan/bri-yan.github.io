# Watercolor study — Astra

A fresh real-time watercolor renderer on `astra-attempt`, based on local `main`.
React hosts the playground; Three.js owns an explicit WebGL render graph. Leva
provides live controls. There is no dependency on the experimental `test` pipeline.

The rendering approach follows Santiago Esteban Montesdeoca's 2018 thesis,
*Real-time Watercolor Rendering of 3D Objects and Animation with Enhanced Control*.
This is a practical implementation of its main effects, with documented approximations,
not a reproduction of every effect or a fluid simulation. See [EXPLAINER.md](EXPLAINER.md).

## Run

Use Node 22 and pnpm 10 (the versions used for validation).

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm build
pnpm preview
pnpm lint
```

A WebGL2 browser with renderable half-float textures is required. Setup and shader
errors appear in the preview. No external services, API keys, or texture downloads
are needed. There is no automated test framework or TypeScript check configured;
see the visual validation checklist below. The production build currently emits
Vite's advisory warning about the main bundle size.

## Explore

- Drag to orbit; scroll to zoom. Scene selects a torus, knot, sphere, box, cylinder,
  cone, or overlapping shapes. Rotation is opt-in.
- Click the pipeline views to inspect color, depth, local controls, detected edges,
  widened edges, paper, pigment, bleeding, or final surface. Click again or Escape
  to return to the final painting. Debug also provides alpha and RGB × alpha views.
- Start with **Edges → Strength** and **Width**. They change pigment accumulation,
  not a separately painted border. Use Color sensitivity 0 to inspect depth-only edges.
- **Lighting** controls inverse diffuse dilution, Blinn–Phong specular highlights, and
  the light position. The two lighting views share one buffer. Set both amount controls
  to zero for unlit pigment; use threshold/softness to shape highlight boundaries.
- Paper controls granulation, dry brushing, relief, and displacement. Bleeding controls
  wet spread; Paint → Control variation 1 introduces dry regions on the mesh.
- Session → Save settings persists explicitly under `astra-watercolor-controls-v1`.
  Reset clears this saved preset. The old `watercolor-pipeline-controls` key is untouched.

## Validation checklist

1. With bleeding, distortion, granulation, and dry brush at zero, compare edge strength
   0 and 4. The shape's coverage must remain fixed; only pigment darkens.
2. Compare edge width 1 and 8 using the Edge spread view. On the knot or overlapping
   shapes, depth-only detection should retain both silhouettes and occlusion boundaries.
3. Compare bleeding 0 and 1. Color should spread beyond the silhouette without a black
   fringe. Use full control variation to inspect wet/dry boundaries.
4. Compare paper height to dry brushing: paint catches peaks and exposes valleys.
5. On a sphere, move Light X across the object; the lit side should follow. In Specular
   highlights view, strength 0 with threshold 0 must stay black. Compare softness 0 and
   0.3; Wash alpha must stay unchanged as diffuse/specular amounts change.
6. Try every shape, alpha debug, rotation, resizing, and render scale. Check the console
   for GPU compilation errors. Reload without saving to restore defaults/saved values.

No changes have been committed or published. Work present on `test` before branching
was preserved in the named stash `Preserve test watercolor work before astra-attempt`.
