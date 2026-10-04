# RGBD Watercolor Pipeline Foundation

The scene is rendered into data passes, turned into a watercolor paint layer,
and finished on procedural paper.

## One frame

```text
                                             scene
                ┌───────────────────────────┬──┴──────────────┬───────────────┐
             diffuse                   turbulence           depth         specular
       ┌────────┴─────────┐                 │                 │               │
color override        dilution              │               sobel             │             substrate
       └──────────────────┼─────────────────┘                 │               │                 ├───────────────┬───────┐
                 diffuse-composition                     sobel-blur           │           granulation*     dry-brush*   │
                          │                                   │               │                 │               │       │
              diffuse-composition-blur                        │               │                 │               │       │
                          └─────────────────┬─────────────────┘               │                 │               │       │
                                     edge-darkening                           │                 │               │       │
                                            └─────────────────────────────────┴───┬─────────────┴───────────────┴───────┘
                                                                               output

* granulation and dry-brush also read diffuse to weight the paper (`reads`, not drawn)
```

`ScenePass` captures original-material RGBA color; clicking `scene` shows it.
Nothing else uses it, so it only renders while you are looking at it.
`DepthPass` produces each registered subject's depth normalized from 0 (its
nearest point) to 1 (its farthest). The range comes from the eight corners of
every mesh's bounding box, transformed into camera view space: stable and
cheap, but approximate, so actual pixels may not reach exactly 0 or 1. To keep
only visible pixels, it first renders the whole scene into the depth buffer
alone, then draws each subject only where it is the frontmost surface.
`OutputPass` draws the finished painting to the screen.

`SubstratePass` generates procedural paper independently of the
scene, modeled on a photo of cold-press watercolor paper. Alpha stores a
normalized 0–1 height: small, slightly vertically elongated, gently warped
noise bumps that form the paper's tooth, with fine grain and a faint broad
drift. RGB is the near-white paper tint lit softly from the upper left across
that height, so the visible bumps are the stored height. The pattern is anchored
to CSS pixels, so it stays put while orbiting or panning, but it scales with
camera zoom about the screen center, so zooming in also zooms into the paper. `OutputPass` reads its height to shape the painting. The Substrate section's `height map` toggle displays its alpha
as grayscale from any debug view, until another view is picked; normal
substrate inspection displays the paper RGB without a checkerboard.

`SobelPass` finds edges in depth. A shared directional
shader produces private horizontal and vertical gradients, then a combine pass
writes their continuous grayscale magnitude. Its alpha follows depth
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
(§5.3), applied by `OutputPass` as it draws the finished painting. It measures
the paper's slope straight from the height (which way is uphill, and how
steep) and applies it to the edge-darkened paint. **Distortion** samples the paint slightly uphill, so pigment slides into
the paper's valleys and edges wobble with the tooth. **Specular highlights** are
then left unpainted, like a watercolorist saving the white of the paper: the
specular mask removes pigment, so bare paper shows. The paint is then laid over
the flat paper color. **Lighting** shades the result as if the paper were lit
from one side, using a surface normal rebuilt from the slope (it points up,
leaning toward the valley). Each effect has its own toggle, and with both off
the output shows clean paint on flat paper. The paper is the background.

`DiffusePass` captures a flat-to-Lambert
response from the scene; `ColorOverridePass` maps it from navy shadow to cyan
base pigment. Its Color Override enable toggle instead leaves the base pigment
under the Lambert response when disabled. `DilutionPass`
uses the same diffuse response to thin coverage in lit areas.
`DiffuseCompositionPass` joins the two into one watercolor layer: color-override
pigment in RGB, dilution density in alpha, laid over paper in the output.

It also adds pigment turbulence (Montesdeoca §5.1.1): the uneven, cloudy
settling of pigment in a wet wash. `TurbulencePass` paints 3D Perlin fBm noise
onto each surface in the object's own coordinates, so the pattern stays stuck
to the object as it or the camera moves. Where the noise is positive, pigment
piles up (the same hue, darker and richer, and denser); where it is negative,
the wash thins toward the paper. Intensity, scale, octaves (how much fine
detail) and an optional warp (which swirls the blotches into flows) are
adjustable; intensity 0 turns it off.

Two more effects come from the paper itself (Montesdeoca §5.1.2), each read
from the diffuse light and the substrate height. **Granulation** lets pigment
settle into the paper's valleys and drain off its peaks, mostly in the shadows,
so dark washes look grainy. **Dry brush** leaves the paper's peaks bare where a
thinly loaded brush would skip them, mostly in the brightest light, so lit
passages break up into speckled paper. Granulation has an intensity; dry brush
has an amount and a softness. Both are applied in the output, after the paper
distortion has slid the paint into the valleys but at the undistorted pixel,
so the grain and the bare peaks sit exactly on the paper you see, stay crisp,
and dry-brush gaps never pick up an edge-darkened rim.
`SpecularPass` is a thresholded Blinn–Phong mask that marks the highlights.
These passes share one world-space light position.

The Leva panel sits on the same sketchbook plate as the pipeline graph (Fig. 2 —
the controls, in ink on vellum with pigment-colored sliders that follow the base
color) and opens with **Inspect**, which picks the debug view. The rest is
grouped the way a painter thinks about the image: **Light**
(position, with Diffuse intensity and Specular highlights), **Pigment** (colors,
dilution, Turbulence, Granulation, Dry brush, and Wetness for the paint blur), **Edges** (darkening and
its width, with Detection holding the sobel settings and bounding boxes), and
**Substrate** (height map, color, scale, and the Distortion and Lighting
effects, each with its own toggle). **Session** at the bottom saves or resets. There is no background control: the paper is the
background.

## The cursor and repainting

Over the painting, the system cursor is replaced by one `OutputPass` draws: a
small black ink ring that works as a window onto the bare paper. Inside it the
painting is lifted, so wherever it points, over the paint or the empty sheet,
you see the substrate itself, fixed to the paper as the ring moves across it.
The ring is a perfect circle the paper tooth nudges very slightly, and it
tightens while a button is held. It is sized in real screen pixels like a
system cursor. The plates and the debug views keep the normal cursor.

The painting is only repainted when it can have changed: when the camera
moves, the window resizes, or a control changes. Otherwise every pass keeps
its last result and only the final composite redraws, which is one cheap pass.
That keeps the cursor at the display's frame rate over a still painting
instead of waiting on the whole pipeline every frame.

## Empty pixels and inspection

Intermediate targets stay neutral: the scene capture clears to transparent
black; depth clears to zero with alpha coverage zero. The checkerboard exists
only in `DebugPass`, marking absent data in every non-output probe. Output
is the only opaque/composited view. Its checker cells are fixed screen-space
squares, so resizing the window does not stretch them.

While inspecting depth or sobel, `bounding boxes` (Edges › Detection) draws the registered subjects'
transformed per-mesh bounds in orange after `DebugPass` displays the FBO. It
never changes depth data or output.

All intermediate targets follow the canvas's device-pixel ratio, so the
captures stay aligned when browser zoom changes.

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
