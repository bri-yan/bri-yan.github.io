# Real-time watercolor synthesis

An experimental React Three Fiber render pipeline for building an art-directed,
real-time watercolor renderer.

The pipeline renders the scene once into everything the painting needs, finds
depth edges, blurs and edge-darkens the paint layer, and finishes it on
procedural paper, with live controls for every effect. It repaints only when
the view or a control changes. See `EXPLAINER.md` for the rendering model and
`AGENTS.md` for the development contract.

```bash
pnpm install
pnpm dev
```
