# Real-time watercolor synthesis

An experimental React Three Fiber render pipeline for building an art-directed,
real-time watercolor renderer.

The `synthesis` branch is a minimal pipeline foundation: it captures independent
raw color and raw-depth images, derives normalized depth for registered subjects,
and retains synchronized live controls and an interactive pipeline debugger. See
`EXPLAINER.md` for the rendering model and `AGENTS.md` for the development
contract.

```bash
pnpm install
pnpm dev
```
