# Source structure

- `config/`: defaults, render-target options, and frame priorities.
- `dev/`: Leva controls for the painting's live parameters.
- `pipeline/`: the scene render, edge, paint-layer, substrate, composite, and
  output passes, the repaint check, and fullscreen-quad helpers.
- `shaders/`: GLSL for each pass, with shared chunks in `shaders/chunks/`.
- `views/`: the selectable views (single objects and a composition) and their
  primitive shapes.
- `components/`: the active view's scene, camera, and the unpaint/paint-in
  switch between views, and the overlay UI: a
  shared figure `Plate` and the themed Leva panel (Fig. 1).

Before adding or removing a pass, read the synchronization rules in
`../AGENTS.md`.
