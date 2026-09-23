# RGBD Watercolor Pipeline Foundation

This branch establishes render data, not a watercolor look.

## One frame

```text
substrate

scene ──> color ──> output
   ├───> raw-depth ──> normalized-depth ──> sobel
   ├───> diffuse ──> color override
   │                 └──> dilution
   └───> specular
```

`RawColorPass` captures original-material RGBA color. `RawDepthPass` separately
captures the same scene: red is unnormalized linear view-space distance and
alpha is coverage. `NormalizedDepthPass` calculates each registered subject's
range on the CPU from the eight corners of every mesh's local bounding box after
transforming them into camera view space. The range is stable and inexpensive,
but approximate: actual mesh pixels may not reach exactly 0 or 1. Its final
image still compares each subject to full-scene raw depth, so only visible pixels
are written. `OutputPass` composites only color.

`SubstratePass` generates stationary procedural paper independently of the
scene, modeled on a photo of cold-press watercolor paper. Alpha stores a
normalized 0–1 height: small, slightly vertically elongated, gently warped
noise bumps that form the paper's tooth, with fine grain and a faint broad
drift. RGB is the near-white paper tint lit softly from the upper left across
that height, so the visible bumps are the stored height. The pattern is anchored
to CSS pixels, so it stays put under camera movement, resizing, and browser
zoom. Substrate is currently debug-only: it does not
alter output. Its Debug/Substrate `show height` toggle displays alpha as
grayscale; normal substrate inspection displays the paper RGB without a
checkerboard.

`SobelPass` is a debug-only normalized-depth edge probe. A shared directional
shader produces private horizontal and vertical gradients, then a combine pass
writes their continuous grayscale magnitude. Its alpha follows normalized-depth
coverage, so only absent pixels checkerboard. Strength scales edge brightness;
integer radius selects the source-pixel sampling distance. It does not affect output.

The lighting branch is debug-only. `DiffusePass` captures a flat-to-Lambert
response from the scene; `ColorOverridePass` maps it from navy shadow to cyan
base pigment. Its Color Override enable toggle instead leaves the base pigment
under the Lambert response when disabled. `DilutionPass`
uses the same diffuse response to thin coverage in lit areas. `SpecularPass`
is an independent thresholded Blinn–Phong mask. These probes share one
world-space light position but do not affect output yet.

The Leva Lighting folder groups the controls into Diffuse, Color Override,
Specular, and Dilution subfolders. The Sobel section controls edge strength and
integer source-pixel radius.

## Empty pixels and inspection

Intermediate targets stay neutral: color clears to transparent black; raw and
normalized depth clear to zero with alpha coverage zero. The checkerboard exists
only in `DebugPass`, marking absent data in every non-output probe. Output
is the only opaque/composited view. Its checker cells are fixed screen-space
squares, so resizing the window does not stretch them.

While inspecting normalized depth, `show bounding boxes` draws the registered
subjects' transformed per-mesh bounds in orange after `DebugPass` displays the
FBO. It never changes normalized-depth data or output.

Raw depth is previewed through the active camera near/far range, but its stored
value remains a scene-unit distance for later edge and pigment effects.

All intermediate targets follow the canvas's device-pixel ratio. Normalized
depth samples raw depth with each fragment's projected screen UV, rather than
assuming its FBO has the same pixel grid. This keeps the captures aligned when
browser zoom changes.

Dilution is inspected as coverage grayscale; its checkerboard appears only for
zero coverage, rather than for partially diluted pixels.

## Tooling and subjects

`PIPELINE_STAGES` is the shared graph/debug definition. Clicking `scene` probes
the same color capture as clicking `color`, so both nodes highlight together.

`useWatercolorSubject(ref, id)` registers a mesh or group for object-local
normalization. The torus knot is registered as `torus-knot`; add only intentional
watercolor subjects because each has its transformed mesh bounds evaluated every
rendered frame.
