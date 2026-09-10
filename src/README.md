# Source layout

`App.jsx` composes the playground, Leva panel, pipeline view, and watercolor canvas.

- `watercolor/`: renderer, lifecycle bridge, defaults, and raw shaders.
- `components/PipelineDiagram.jsx`: clickable intermediate-view graph.
- `dev/useWatercolorControls.js`: validated live settings and isolated saved presets.

Read ../EXPLAINER.md for the render graph and texture channel contracts.
