# Source structure

- `config/`: shared pipeline definition, defaults, render-target options, and
  frame priorities.
- `dev/`: Leva controls for active parameters and debug views only.
- `pipeline/`: raw-color, raw-depth, normalized-depth, output, and debug passes plus fullscreen-
  quad helpers.
- `shaders/`: GLSL used by the active image-space passes.
- `components/`: the test scene and pipeline graph UI.

Before adding or removing a pass, read the synchronization rules in
`../AGENTS.md`.
