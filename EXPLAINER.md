# RGBD Watercolor Pipeline Foundation

The scene is rendered once into the data the painting needs, turned into a
watercolor paint layer, and finished on procedural paper.

## One frame

```text
scene
  └─► surface (one render into two targets)
        ├─ [0] paint layer, premultiplied ────────┐
        ├─ [1] subject depth ──► sobel ──► edges ─┴─► edge darkening (both blurs) ──► paint ─┐
        └─ [1] diffuse, specular, coverage ──────────────────────────────────────────────────┤
substrate (paper; only when zoom, size, color, or scale change) ─────────────────────────────┤
                                                                                             ▼
                                                                                         composite ──► painting ──► output, with the cursor ──► screen
```

The pipeline is five passes, plus the output that puts the result on screen.
Each stage is computed only as far as the next one needs it; there are no
in-between images kept for inspection.

`SurfacePass` renders the scene once and writes two images at the same time.
The first is the watercolor layer itself: the base pigment mapped by the
light, thinned where it is lit, and mottled by pigment turbulence. It is
stored premultiplied, color times density, so blurring it later never drags
in color from empty pixels. The second holds what the later passes read about
the surface: the diffuse light, the specular highlight mask, each subject's
depth, and coverage. To shade each pixel only once, it first renders the
whole scene into the depth buffer alone, then shades only the frontmost
surface.

**Diffuse** is a flat-to-Lambert response from one world-space light.
**Color override** maps it from navy shadow to cyan base pigment; with
override off, the base pigment sits under the Lambert response instead.
**Dilution** uses the same light to thin the wash where it is lit.
**Pigment turbulence** (Montesdeoca §5.1.1) is the uneven, cloudy settling of
pigment in a wet wash: 3D Perlin fBm noise painted onto each surface in the
object's own coordinates, so the pattern stays stuck to the object as it or
the camera moves. Where the noise is positive, pigment piles up (the same hue,
darker and richer, and denser); where it is negative, the wash thins toward
the paper. Intensity, scale, octaves (how much fine detail) and an optional
warp (which swirls the blotches into flows) are adjustable; intensity 0 turns
it off. **Specular** is a thresholded Blinn–Phong mask that marks the
highlights.

**Depth** is each registered subject's depth normalized from 0 (its nearest
point) to 1 (its farthest). The range comes from the eight corners of every
mesh's bounding box, transformed into camera view space: stable and cheap,
but approximate, so actual pixels may not reach exactly 0 or 1. Meshes that
aren't subjects still hide what is behind them, but have no depth of their
own.

`SobelPass` finds edges in that depth in a single pass: both gradients at
once, combined into a continuous edge strength. Strength scales it; the
integer radius selects the source-pixel sampling distance.

`EdgeDarkeningPass` blurs two things at once with the same pair of passes,
one horizontal and one vertical: the paint layer (the **paint blur**, how wet
the wash looks) and the edges (the **width** of the darkened rim). Radii are
in screen-size-independent pixels, so window size and browser zoom don't
change how soft things look, and 0 leaves a signal untouched. Neighboring
blur taps are merged in pairs, each read once between the two, which halves
the work. Then it imitates pigment gathering at the rim of a drying wash
(Montesdeoca §5.2.1): the blurred edges say how close each pixel is to an
edge, fading smoothly inward, and the paint is concentrated there. The rim
keeps the hue of whatever color is there and becomes darker and richer (done
in the perceptual OKLab color space), so cyan washes get deep cyan rims and
violet washes deep violet ones, and it eases off before reaching black.
Density thickens too, so less paper shows through at the rim. Darkening 0
leaves the paint untouched.

`SubstratePass` generates procedural paper independently of the scene,
modeled on a photo of cold-press watercolor paper. Alpha stores a normalized
0–1 height: small, slightly vertically elongated, gently warped noise bumps
that form the paper's tooth, with fine grain and a faint broad drift. RGB is
the near-white paper tint lit softly from the upper left across that height,
so the visible bumps are the stored height. The pattern is anchored to CSS
pixels, so it stays put while orbiting or panning, but it scales with camera
zoom about the screen center, so zooming in also zooms into the paper. The
noise is the most expensive per-pixel work in the pipeline, so the paper is
only regenerated when the zoom, the window size, or its own color or scale
change, never while orbiting.

`CompositePass` finishes the painting on the paper, following Montesdeoca's
thesis (§5.3). It measures the paper's slope straight from the height (which
way is uphill, and how steep) and applies it to the edge-darkened paint.
**Distortion** samples the paint slightly uphill, so pigment slides into the
paper's valleys and edges wobble with the tooth. Two effects then come from
the paper itself (§5.1.2), read from the diffuse light and the paper height at
the undistorted pixel, so the grain and the bare peaks sit exactly on the
paper you see, stay crisp, and dry-brush gaps never pick up an edge-darkened
rim. **Granulation** lets pigment settle into the paper's valleys and drain
off its peaks, mostly in the shadows, so dark washes look grainy. **Dry
brush** leaves the paper's peaks bare where a thinly loaded brush would skip
them, mostly in the brightest light, so lit passages break up into speckled
paper. Left to the paper's own height, the bare patches gather on its broad
hills and merge into large areas as the amount grows; **density** instead
counts only how far each point rises above the paper right around it, so the
bare flecks come out smaller, more numerous, and evenly spread, and a larger
amount adds flecks rather than blotches. **Specular highlights** are then left unpainted, like a watercolorist
saving the white of the paper: the specular mask removes pigment, so bare
paper shows. The paint is then laid over the flat paper color. **Lighting**
shades the result as if the paper were lit from one side, using a surface
normal rebuilt from the slope (it points up, leaning toward the valley).
Distortion and lighting each have their own toggle, and with both off the
output shows clean paint on flat paper. The paper is the background.

`OutputPass` copies the finished painting to the screen and draws the cursor
over it.

The Leva panel sits on a sketchbook plate (Fig. 1 — the controls, in ink on
vellum with pigment-colored sliders that follow the base color). It is
grouped the way a painter thinks about the image: **Light** (position, with
Diffuse intensity and Specular highlights), **Pigment** (colors, dilution,
Turbulence, Granulation, Dry brush, and Wetness for the paint blur),
**Edges** (darkening and its width, with Detection holding the sobel
settings), and **Substrate** (color, scale, and the Distortion and Lighting
effects, each with its own toggle). **Session** at the bottom saves or
resets. There is no background control: the paper is the background.

## The cursor and repainting

Over the painting, the system cursor is replaced by one `OutputPass` draws: a
small black ink ring that works as a window onto the bare paper. Inside it the
painting is lifted, so wherever it points, over the paint or the empty sheet,
you see the substrate itself, fixed to the paper as the ring moves across it.
The ring is a perfect circle the paper tooth nudges very slightly, and it
tightens while a button is held. It is sized in real screen pixels like a
system cursor. The controls plate keeps the normal cursor.

The page draws a frame only when something changes: the camera moves, the
window resizes, a control changes, or the mouse moves over the painting. A
still page draws nothing. When it does draw, the painting is only repainted
if it can have changed; otherwise the finished painting is simply copied to
the screen with the cursor, one cheap pass, so the cursor keeps the display's
frame rate. A repaint is seven draws (eight while zooming, when the paper is
regenerated too), down from about twenty.

## Targets and empty pixels

All render targets follow the canvas's device-pixel ratio, so they share one
pixel grid and stay aligned when browser zoom changes. Empty pixels stay
neutral: the scene render clears to transparent black, so paint, depth, and
coverage are all zero where there is no geometry, and blurs carry density
rather than color into them.

## Subjects

`useWatercolorSubject(ref, id)` registers a mesh or group for object-local
depth normalization. Add only intentional watercolor subjects, because each has
its transformed mesh bounds evaluated on every repaint.

## Views

The page shows one view at a time: a single object (torus knot, sphere, cube,
icosahedron, torus, teapot) or a composition of several (the forms study: a
hexagonal prism, a sphere, a cone standing on a low block, and an icosahedron,
seen from higher up). The view select in the Scene section at the top of the
controls switches between them, and the choice is remembered. Each object is a
subject. Shapes are sized in their geometry, not by scaling the mesh, so the
pigment turbulence, which follows the geometry's own coordinates, has the same
mottling on every one. The camera is framed once for the first view; switching
leaves it exactly where it is, so the painting changes under an unchanged
view. The
surface render draws both sides of every face, so open surfaces such as the
teapot's lid gap and spout shade correctly.

Switching goes through bare paper. The painting is unpainted the way a dry
brush runs out of paint: the paper's peaks go bare first, then its valleys,
until only paper is left, while the shading flattens, the wash thins, and what
is left fades away, so no outline of the shape lingers. The
new view is then painted in the same way backwards, valleys first. Each half
takes under a second, and choosing the first view again mid-way simply
reverses it.
