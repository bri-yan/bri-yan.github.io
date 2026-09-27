# RGBD Watercolor Pipeline Foundation

The scene is rendered into data passes, turned into a watercolor paint layer,
and finished on procedural paper.

## One frame

```text
                                scene
        ┌─────────────────────────┼───────────────────┐
    raw-depth                  diffuse            specular
        │                  ┌──────┴──────┐            │
normalized-depth    color override   dilution         │
        │                  └──────┬──────┘            │
      sobel              diffuse-composition          │
        │                         │                   │
   sobel-blur         diffuse-composition-blur        │       substrate
        └────────────┬────────────┘                   │           │
              edge-darkening                          │       gradient
                     └──────────────────────┬─────────┴───────────┘
                                      substrate-fx
                                            │
                                         output
```

`ScenePass` captures original-material RGBA color; clicking `scene` shows it.
`RawDepthPass` separately
captures the same scene: red is unnormalized linear view-space distance and
alpha is coverage. `NormalizedDepthPass` calculates each registered subject's
range on the CPU from the eight corners of every mesh's local bounding box after
transforming them into camera view space. The range is stable and inexpensive,
but approximate: actual mesh pixels may not reach exactly 0 or 1. Its final
image still compares each subject to full-scene raw depth, so only visible pixels
are written. `OutputPass` draws the finished painting (`substrate-fx`) to the
screen.

`SubstratePass` generates stationary procedural paper independently of the
scene, modeled on a photo of cold-press watercolor paper. Alpha stores a
normalized 0–1 height: small, slightly vertically elongated, gently warped
noise bumps that form the paper's tooth, with fine grain and a faint broad
drift. RGB is the near-white paper tint lit softly from the upper left across
that height, so the visible bumps are the stored height. The pattern is anchored
to CSS pixels, so it stays put under camera movement, resizing, and browser
zoom. It shapes the painting through `gradient` and `substrate-fx`. The Substrate section's `height map` toggle displays its alpha
as grayscale from any debug view, until another view is picked; normal
substrate inspection displays the paper RGB without a checkerboard.

`SobelPass` finds edges in normalized depth. A shared directional
shader produces private horizontal and vertical gradients, then a combine pass
writes their continuous grayscale magnitude. Its alpha follows normalized-depth
coverage, so only absent pixels checkerboard. Strength scales edge brightness;
integer radius selects the source-pixel sampling distance.

`BlurPass` is a reusable Gaussian blur, currently applied to sobel
(`sobel-blur`) and diffuse composition (`diffuse-composition-blur`). It runs a
horizontal then a vertical pass. Its radius is in CSS pixels, so browser zoom
doesn't change how soft it looks, and 0 leaves the input untouched. Color is
blurred premultiplied by alpha, so transparent pixels don't smear dark fringes
into edges and alpha still means coverage or density afterwards. It can repeat
its passes (`iterations`) if a softer result is needed later.

`EdgeDarkeningPass` imitates pigment gathering at the rim of a drying wash
(Montesdeoca §5.2.1). The blurred sobel edges say how close each pixel is to an
edge, fading smoothly inward, and the paint is concentrated there. The rim
keeps the hue of whatever color is there and becomes darker and richer (done in
the perceptual OKLab color space), so cyan washes get deep cyan rims and violet
washes deep violet ones, and it eases off before reaching black. Density
thickens too, so less paper shows through at the rim. The sobel blur radius sets how wide the band is; strength 0
leaves the paint untouched.

The substrate shapes the paint through two effects from Montesdeoca's thesis
(§5.3). `GradientPass` measures the paper's slope from its height: which way is
uphill, and how steep. `SubstrateFxPass` then applies it to the edge-darkened
paint. **Distortion** samples the paint slightly uphill, so pigment slides into
the paper's valleys and edges wobble with the tooth. **Specular highlights** are
then left unpainted, like a watercolorist saving the white of the paper: the
specular mask removes pigment, so bare paper shows. The paint is then laid over
the flat paper color. **Lighting** shades the result as if the paper were lit
from one side, using a surface normal rebuilt from the slope (it points up,
leaning toward the valley). Each effect has its own toggle, and with both off
the node shows clean paint on flat paper. This is the finished painting, and
the output shows it; the paper is the background.

`DiffusePass` captures a flat-to-Lambert
response from the scene; `ColorOverridePass` maps it from navy shadow to cyan
base pigment. Its Color Override enable toggle instead leaves the base pigment
under the Lambert response when disabled. `DilutionPass`
uses the same diffuse response to thin coverage in lit areas.
`DiffuseCompositionPass` joins the two into one watercolor layer: color-override
pigment in RGB, dilution density in alpha, laid over paper in substrate fx.
`SpecularPass` is a thresholded Blinn–Phong mask that marks the highlights.
These passes share one world-space light position.

The Leva Lighting folder groups the controls into Diffuse, Color Override,
Specular, and Dilution subfolders. The Sobel section controls edge strength and
integer source-pixel radius. The Blur section sets each blur's radius. The Edge
Darkening section sets its strength. The Substrate FX section toggles
distortion and lighting, and shows each one's settings while it is on. There is
no background control: the paper is the background.

## Empty pixels and inspection

Intermediate targets stay neutral: the scene capture clears to transparent black; raw and
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
zero coverage, rather than for partially diluted pixels. Diffuse composition is
inspected as pigment blended over the checkerboard by its density, so lit,
thinned areas let the checkerboard show through. Each blurred stage uses the same
display as its source.

## Tooling and subjects

`PIPELINE_STAGES` is the shared graph/debug definition. Clicking `scene` shows
the raw scene capture, with an RGB/alpha channel picker.

`useWatercolorSubject(ref, id)` registers a mesh or group for object-local
normalization. The torus knot is registered as `torus-knot`; add only intentional
watercolor subjects because each has its transformed mesh bounds evaluated every
rendered frame.
