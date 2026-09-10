# How this watercolor renderer works

The scene first makes a complete picture of the object. Later stages change how its
paint looks. There is no separate body strip and edge strip to fit together.

Think of three sheets laid beside the painting: one tells us how far each surface is
from the camera, another marks where effects should be stronger, and a third describes
the bumps in the paper. The shaders consult these sheets as they work on the painting.

## One frame, in order

`src/watercolor/createRenderer.js` owns the targets, materials, shapes, camera, and
render loop. It renders the same scene three times without cloning meshes: lighting signals,
the color wash, and depth plus local controls. A fullscreen triangle processes
the resulting images in a single explicit sequence. No React mount-order scheduling
or legacy pass helpers are involved.

| Stage | What it writes and why |
| --- | --- |
| Diffuse / specular | One shared lighting target: red is inverse Lambert shadow, green is a thresholded Blinn–Phong highlight, blue is illumination, alpha is geometry coverage. A world-space point light is transformed into view space each frame. |
| Color wash | Complete pigment RGB, diluted by diffuse illumination and specular highlights toward white reflectance; alpha stays object coverage. |
| Depth / controls | One shared target: RGB contains local edge, pigment, wetness strengths; alpha contains positive view-space distance divided by camera far distance. Background depth is far, with zero controls. |
| Detected edges | 3×3 Sobel differences of color and linear depth. Depth reveals the silhouette and occlusions even when both surfaces have the same pigment color. |
| Edge spread | Horizontal and vertical Gaussian filtering widens those differences into a gradual band. It never supplies extra paint coverage. |
| Paper | Procedural height in red; encoded horizontal/vertical slopes in green/blue. Coordinates are tied to CSS pixels, so paper stays fixed during camera movement. |
| Pigment | Recovers pigment RGB independently of alpha, concentrates it with a color exponent, then applies coverage once. Density combines base pigment, local controls, edges, and valley granulation. Dry brushing can reduce coverage in valleys. |
| Bleeding | Horizontal color + wetness-mask expansion, then vertical color + mask expansion, then a controlled blend with the original pigment. Uses depth to decide which neighboring colors may enter. |
| Surface | Small paper-slope displacement, paper tint, and lighting of paper relief. Composites premultiplied paint over opaque paper. |
| Display | Converts linear color to display sRGB exactly once; alternatively displays a selected intermediate view. |

The diagram shows twelve inspectable views, not ten GPU draws: depth and controls share
one target, and the directional filters need several draws. The current graph makes
15 draws per frame and owns 14 targets. Targets are reused and resized with the canvas;
all resources and animation callbacks are released on unmount.

## Why edges darken without a seam

A color channel between zero and one becomes smaller when raised to a larger power.
For example, 0.5 squared is 0.25. The renderer uses this to make pigment denser where
the blurred edge signal is stronger. As that signal fades inward, the extra density
fades too. Coverage still comes from the complete object, so there is no hard interior
cutout and no second colored border.

Width sets Gaussian sampling distance in CSS pixels. A wider normalized blur spreads
the same signal over a larger area and can reduce its peak; strength adjusts the density
separately. Exact channel endpoints (zero or one) are invariant under exponentiation,
so muted pigments show this effect more clearly than saturated endpoint colors.

## Diffuse and specular lighting

Lighting borrows two ideas from `test`, integrated into this branch's color pipeline:

- **Diffuse:** `1 - clamp(ambient + diffuseStrength * max(N·L, 0), 0, 1)`
  is the shadow signal. High shadow keeps the pigment color; illumination dilutes it
  toward white. Diffuse amount controls how much this changes the wash.
- **Specular:** the Blinn–Phong halfway vector combines the surface-to-light and
  surface-to-camera directions. Shininess sets the reflection size; strength and
  threshold determine where it appears. Softness controls the boundary; zero softness
  retains only derivative-based antialiasing. Unlit faces cannot produce highlights.
  Specular amount controls how far this stencil dilutes pigment toward white.

Unlike `test`, these effects do not multiply paint alpha or overwrite the completed
painting. They are part of the wash, so edge concentration, granulation, bleeding, and
paper tint continue to operate on them. A full highlight approaches the actual paper
color after composition. The earlier broad Lambert-based Highlight effect is replaced
by the view-dependent specular stencil.

The saved `shade` and `highlight` keys remain compatible and now appear as Lighting →
Diffuse amount and Specular amount. Saved numbers remain intact, but the lighting model
has changed. New controls use defaults when absent from an older saved preset. Light X/Y/Z
set a world-space point position (stylized, without distance attenuation). Normals, light,
and view vectors meet in view space, correcting the old branch's coordinate mismatch.

Diffuse wash and Specular highlights debug views show the corresponding scalar field.
Their Alpha view shows coverage, not lighting intensity. Both amount controls at zero
return the unlit mottled pigment; specular strength zero produces an empty stencil even
when the threshold is zero. The downstream RGB edge detector can detect highlight rims;
reduce Color sensitivity if only geometry edges should collect pigment.

## Why depth is separate from transparency

Coverage answers “is there paint here?” Depth answers “which surface is in front?”
A torus hole has no paint and far background depth. Where one part crosses another,
both may be painted, but their depths differ. This gives the edge detector the
information that a silhouette-only mask lacked.

In the bleeding filter a wet foreground can spread over background. A dry foreground
rejects incoming color from behind it. Rejected taps contribute the center color,
preserving the filter's total weight. The expanded wetness map is passed to the second
axis so diagonal spread is possible. RGB and coverage are filtered together in
premultiplied form; transparent target pixels therefore cannot introduce black fringes.

## What comes from the thesis, and what is adapted

Source: Santiago Esteban Montesdeoca, *Real-time Watercolor Rendering of 3D Objects
and Animation with Enhanced Control* (2018). Page numbers below are printed pages;
the supplied PDF's page index is offset by 20.

- **pp67–74:** painterly shading, highlight dilution, and mesh-attached effect control
  images. This implementation adapts the test branch’s inverse Lambert and
  thresholded Blinn–Phong lighting, and uses analytic mesh-local variation. It does not reproduce the full cangiante, shade-tint, or artist-painted
  vertex-control system. At control variation 1, the wetness field includes true zeros.
- **pp79–86:** pigment density through color exponentiation, granulation, dry brushing,
  and RGB + depth Sobel edges followed by Gaussian spreading. Here edge depth differences
  are bounded to keep the far background from dominating; global width replaces local
  width painting. Density/application formulas are simplified. Granulation accumulates
  in valleys; dry brushing leaves those valleys exposed.
- **pp91–93:** screen-space paper height/slopes, pigment displacement, and paper lighting.
  Our paper is procedural value noise, not a measured/reconstructed paper profile. Our
  displacement guard preserves foreground coverage against distant background samples;
  it differs from the thesis's locally controlled foreground distortion rule.
- **pp94–97, Algorithm 2:** separable depth/control-aware bleeding, center substitution,
  expanded masks, and final mask blend. We use 21 taps per axis with sigma 5 in tap units
  and adjustable sample spacing (the thesis uses sigma 20). Edge strength is attenuated
  using local wetness before bleeding, rather than reconstructing the thesis's complete
  separate edge-bleeding control system.

Warm paper composition, explicit premultiplied coverage, bounded pixel radii, and
half-float targets are engineering choices. Gap/overlap simulation, RYB mixing,
vertex painting tools, cast shadows, and physical fluid transport are not implemented.
Screen-fixed paper may visibly change its interaction with a rotating object; RGB
edge detection can also find shading variation. These are useful tuning tradeoffs,
not evidence of a separate body/edge seam.

## Files and conventions

- `src/App.jsx`: playground shell, selected debug view, error presentation.
- `src/watercolor/WatercolorCanvas.jsx`: React lifecycle and resize/settings bridge.
- `src/watercolor/createRenderer.js`: explicit rendering sequence and resource ownership.
- `src/watercolor/shaders/`: raw GLSL, one clearly named stage per file.
- `src/watercolor/settings.js`: defaults, shape choices, and inspectable view definitions.
- `src/dev/useWatercolorControls.js`: live Leva controls, validation and explicit persistence.
- `src/components/PipelineDiagram.jsx`: grouped, clickable view graph.

Colors entering Three from hex strings are already converted to linear working space.
Do not convert them again. Intermediate targets have no color-space transform or tone
mapping. Color/paint targets use premultiplied RGB and coverage; depth alpha is data,
not transparency. Paper alpha is 1; its meaningful height is red. Debug color views
show paint over white; alpha and RGB × alpha expose the actual stored channels.

When adding an effect, declare its inputs and output meaning, create its target once,
wire the draw after its inputs, dispose resources, and add useful controls and a debug
view. Every visible slider should affect the renderer. Keep new experiments isolated
from other branches and their localStorage presets.
