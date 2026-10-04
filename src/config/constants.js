import * as THREE from 'three';

// Render targets share the canvas's pixel grid (drei's useFBO sizes them to
// it), so fullscreen passes sample each other at vUv. HalfFloat throughout:
// premultiplied paint needs more than 8 bits at low density, the substrate
// height and depth need it for 1-texel differences, and depth marks
// non-subjects with −1.
const SCREEN_TARGET = {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat,
  type: THREE.HalfFloatType,
};
// Fullscreen passes draw every pixel, so only the scene render needs depth.
export const TARGET_OPTIONS = { ...SCREEN_TARGET, depthBuffer: false };
// SurfacePass (MRT, with the default depth buffer): [0] premultiplied paint,
// [1] diffuse, specular, subject depth, coverage.
export const SURFACE_TARGET_OPTIONS = { ...SCREEN_TARGET, count: 2 };
// The horizontal blur (MRT): [0] paint, [1] edges.
export const BLUR_TARGET_OPTIONS = { ...TARGET_OPTIONS, count: 2 };
// The finished painting, 8-bit like the screen it is copied to.
export const PAINTING_TARGET_OPTIONS = {
  ...TARGET_OPTIONS,
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,
  type: THREE.UnsignedByteType,
};
export const BLUR_MAX_TAPS = 32; // per side; keep MAX_BLUR_PAIRS in chunks/blur.glsl at half this

export const DEFAULT_LIGHT_POSITION = [5, 5, 5];
export const DEFAULT_DIFFUSE_AMOUNT = 1;
export const DEFAULT_COLOR_OVERRIDE_BASE_COLOR = new THREE.Color(0x00ffff);
export const DEFAULT_COLOR_OVERRIDE_SHADOW_COLOR = new THREE.Color(0xc65cff);
export const DEFAULT_DILUTION_STRENGTH = 0.67;
export const DEFAULT_SPECULAR_SHININESS = 56;
export const DEFAULT_SPECULAR_STRENGTH = 0.68;
export const DEFAULT_SPECULAR_THRESHOLD = 0.1;
export const DEFAULT_SOBEL_STRENGTH = 4;
export const DEFAULT_SOBEL_RADIUS = 1;
export const DEFAULT_SUBSTRATE_COLOR = new THREE.Color(0xf7f1ec);
export const DEFAULT_SUBSTRATE_SCALE = 6;
// Floor on the zoomed substrate scale: finer tooth would alias on the pixel grid.
export const MIN_PAPER_SCALE = 0.5;
export const DEFAULT_COMPOSITION_BLUR_RADIUS = 12; // CSS pixels, ≈3σ
export const DEFAULT_SOBEL_BLUR_RADIUS = 1;
export const BLUR_MAX_RADIUS = 16;
export const DEFAULT_TURBULENCE_INTENSITY = 0.5;
export const DEFAULT_TURBULENCE_SCALE = 1.5; // noise cycles per object unit
export const DEFAULT_TURBULENCE_OCTAVES = 3;
export const TURBULENCE_MAX_OCTAVES = 6; // keep in sync with MAX_OCTAVES in turbulenceFragment.frag
export const DEFAULT_TURBULENCE_WARP = 0;
export const DEFAULT_GRANULATION_INTENSITY = 0.2;
export const DEFAULT_DRY_BRUSH_AMOUNT = 0.4;
export const DEFAULT_DRY_BRUSH_SOFTNESS = 0.05;
export const DEFAULT_DRY_BRUSH_LIGHT_THRESHOLD = 0.6; // diffuse level above which dry brush applies
export const DEFAULT_DRY_BRUSH_LIGHT_SOFTNESS = 0.25;
export const DEFAULT_EDGE_DARKENING = 1.25; // k in Ed = k·Eb
export const DEFAULT_SUBSTRATE_DISTORTION = 6.5; // CSS pixels per unit slope
export const DEFAULT_SUBSTRATE_LIGHT_ANGLE = 120; // degrees, counter-clockwise from the right
export const DEFAULT_SUBSTRATE_LIGHT_STRENGTH = 0.1;
export const DEFAULT_SUBSTRATE_ROUGHNESS = 1;
export const CANVAS_CAMERA = { position: [0, 0, 5], fov: 75 };

// The pipeline is authored on a virtual stage: every "CSS pixel" length (blur
// radii, paper scale, distortion, ...) is measured as if the window's short
// side were STAGE_REFERENCE_SIZE, then scaled to the real window, so a phone
// and an ultrawide show the same painting. The render resolution is capped on
// the short side so cost doesn't grow with the screen.
export const STAGE_REFERENCE_SIZE = 800;
export const RENDER_MAX_SHORT_SIDE = 1440; // device pixels

// Wheel zoom eases toward its target distance instead of jumping per notch.
export const ZOOM_SMOOTHING = 8; // higher settles faster (1/s)
export const ZOOM_SENSITIVITY = 0.0012; // log-distance change per wheel pixel
export const ZOOM_PINCH_BOOST = 8; // trackpad pinch (ctrl+wheel) reports far smaller deltas

// The painting's own cursor, drawn by OutputPass: a perfect ink ring around a
// window onto the bare substrate. Sized in CSS pixels like a system cursor (not
// stage pixels), so it keeps its size at any window size or zoom.
export const CURSOR_RADIUS = 6; // CSS px, to the middle of the line
export const CURSOR_LINE_WIDTH = 1; // CSS px
export const CURSOR_DISTORTION = 0.75; // CSS px per unit paper slope; the ring's own, gentler than the paint's
export const CURSOR_PRESSED_SCALE = 0.88; // radius multiplier while a button is held
export const CURSOR_PRESS_SMOOTHING = 20; // higher settles faster (1/s)

export const FULLSCREEN_QUAD_NDC = [-1, 1, 1, -1, 0, 1];
export const FULLSCREEN_QUAD_SIZE = 2;

// Prioritized frame callbacks disable R3F's automatic render. The pipeline
// therefore owns the complete frame: paper and scene first, then edges, the
// paint layer, the composite, and the output to screen.
// After SmoothZoom (-2) and OrbitControls' update (-1) move the camera, before
// any pass: decides whether this frame repaints (see PaintingFrame).
export const PAINTING_CHECK_FRAME_ORDER = -0.5;
export const SUBSTRATE_PASS_FRAME_ORDER = 0;
export const SURFACE_PASS_FRAME_ORDER = 1;
export const SOBEL_PASS_FRAME_ORDER = 2;
export const EDGE_DARKENING_PASS_FRAME_ORDER = 3;
export const COMPOSITE_PASS_FRAME_ORDER = 4;
export const OUTPUT_FRAME_ORDER = 5;
