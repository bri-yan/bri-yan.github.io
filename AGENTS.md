# Working on astra-attempt

This branch is a fresh thesis-inspired watercolor renderer based on local main.
The user's request explicitly replaces the experimental test-branch architecture.
Read README.md and EXPLAINER.md before non-trivial rendering changes.

- React + Vite + native Three.js + Leva. Run `pnpm dev`, `pnpm build`, `pnpm lint`.
- `src/watercolor/createRenderer.js` owns an explicit ordered render graph, stable
  targets/materials, shape resources, camera, and disposal. Do not add per-frame clones.
- `src/watercolor/shaders/` holds raw GLSL imports. Keep input/output contracts explicit.
- Linear working color throughout; final display converts once. Hex Color.set already
  decodes sRGB. Paint RGB is premultiplied by coverage; geometry alpha is linear depth/far.
- `settings.js` supplies defaults/view definitions. Leva owns live controls; the diagram
  selects the same debug setting. Every exposed control must work, including zero cases.
- Save only explicitly to `astra-watercolor-controls-v1`; do not alter legacy presets.
- Inspect actual GPU output after shader changes. Lint/build do not compile GLSL.
  README lists meaningful visual checks; no test/type-check framework is configured.
- Paper is procedural and several thesis formulas are adapted. Keep source attribution
  and implementation limitations accurate instead of claiming an exact reproduction.
- No deployment or commits without a user request. Preserve existing work on all branches.
