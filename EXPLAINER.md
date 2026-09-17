# RGBD Watercolor Pipeline Foundation

This branch establishes render data, not a watercolor look.

## One frame

```text
scene ──> color ──> output
   └───> raw-depth ──> normalized-depth
```

`RawColorPass` captures original-material RGBA color. `RawDepthPass` separately
captures the same scene: red is unnormalized linear view-space distance and
alpha is coverage. `NormalizedDepthPass` calculates each registered subject's
range on the CPU from the eight corners of every mesh's local bounding box after
transforming them into camera view space. The range is stable and inexpensive,
but approximate: actual mesh pixels may not reach exactly 0 or 1. Its final
image still compares each subject to full-scene raw depth, so only visible pixels
are written. `OutputPass` composites only color.

## Empty pixels and inspection

Intermediate targets stay neutral: color clears to transparent black; raw and
normalized depth clear to zero with alpha coverage zero. The checkerboard exists
only in `DebugViewPass`, marking absent data in every non-output probe. Output
is the only opaque/composited view. Its checker cells are fixed screen-space
squares, so resizing the window does not stretch them.

Raw depth is previewed through the active camera near/far range, but its stored
value remains a scene-unit distance for later edge and pigment effects.

All intermediate targets follow the canvas's device-pixel ratio. Normalized
depth samples raw depth with each fragment's projected screen UV, rather than
assuming its FBO has the same pixel grid. This keeps the captures aligned when
browser zoom changes.

## Tooling and subjects

`PIPELINE_STAGES` is the shared graph/debug definition. Clicking `scene` probes
the same color capture as clicking `color`, so both nodes highlight together.

`useWatercolorSubject(ref, id)` registers a mesh or group for object-local
normalization. The torus knot is registered as `torus-knot`; add only intentional
watercolor subjects because each has its transformed mesh bounds evaluated every
rendered frame.
