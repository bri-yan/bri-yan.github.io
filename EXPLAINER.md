# RGBD Watercolor Pipeline Foundation

This branch establishes render data, not a watercolor look.

## One frame

```text
scene ──> color ──> output
   └───> raw-depth ──> normalized-depth
```

`RawColorPass` captures original-material RGBA color. `RawDepthPass` separately
captures the same scene: red is unnormalized linear view-space distance and
alpha is coverage. `NormalizedDepthPass` renders registered watercolor subjects,
reduces each visible subject to a GPU min/max pair, and writes nearest visible
surface as 0 and farthest as 1. `OutputPass` composites only color.

## Empty pixels and inspection

Intermediate targets stay neutral: color clears to transparent black; raw and
normalized depth clear to zero with alpha coverage zero. The checkerboard exists
only in `DebugViewPass`, marking absent data in every non-output probe. Output
is the only opaque/composited view. Its checker cells are fixed screen-space
squares, so resizing the window does not stretch them.

Raw depth is previewed through the active camera near/far range, but its stored
value remains a scene-unit distance for later edge and pigment effects.

## Tooling and subjects

`PIPELINE_STAGES` is the shared graph/debug definition. Clicking `scene` probes
the same color capture as clicking `color`, so both nodes highlight together.

`useWatercolorSubject(ref, id)` registers a mesh or group for object-local
normalization. The torus knot is registered as `torus-knot`; add only intentional
watercolor subjects because each receives a half-resolution reduction chain.
