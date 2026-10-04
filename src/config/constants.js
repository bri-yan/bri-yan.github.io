import * as THREE from 'three';

// Shared source of truth for the debug selector, debug sources, and the on-screen graph.
// `inputs` names the stages whose output a stage consumes (drawn as graph wires);
// `reads` names stages it also samples without a wire (granulation and dry brush
// weight the paper by the diffuse light, left undrawn to keep the graph tidy). `debugMode` picks the
// debugFragment.frag display (see DEBUG_MODES); stages without one show plain color.
export const PIPELINE_STAGES = [
  {
    key: 'substrate',
    label: 'substrate',
    kind: 'source',
    fboKey: 'substrate',
    debugView: 'substrate',
    debugMode: 'substrate',
    hint: 'stationary procedural paper: RGB color with height in alpha',
    inputs: [],
  },
  {
    key: 'scene',
    label: 'scene',
    kind: 'source',
    fboKey: 'scene',
    debugView: 'scene',
    hint: 'the live scene captured with its original materials',
    inputs: [],
  },
  {
    key: 'diffuse',
    label: 'diffuse',
    kind: 'pass',
    fboKey: 'diffuse',
    debugView: 'diffuse',
    hint: 'flat-to-Lambert scene response with coverage',
    inputs: ['scene'],
  },
  {
    key: 'specular',
    label: 'specular',
    kind: 'pass',
    fboKey: 'specular',
    debugView: 'specular',
    hint: 'thresholded Blinn–Phong highlight mask',
    inputs: ['scene'],
  },
  {
    key: 'color-override',
    label: 'color override',
    kind: 'pass',
    fboKey: 'colorOverride',
    debugView: 'color-override',
    hint: 'diffuse response mapped from shadow to base pigment color',
    inputs: ['diffuse'],
  },
  {
    key: 'dilution',
    label: 'dilution',
    kind: 'pass',
    fboKey: 'dilution',
    debugView: 'dilution',
    debugMode: 'coverage',
    hint: 'diffuse-driven light thinning coverage',
    inputs: ['diffuse'],
  },
  {
    key: 'granulation',
    label: 'granulation',
    kind: 'pass',
    fboKey: 'granulation',
    debugView: 'granulation',
    debugMode: 'signed',
    hint: 'pigment settling into the paper’s valleys (+) and off its peaks (−), strongest where the diffuse light is low',
    inputs: ['substrate'],
    reads: ['diffuse'],
  },
  {
    key: 'dry-brush',
    label: 'dry brush',
    kind: 'pass',
    fboKey: 'dryBrush',
    debugView: 'dry-brush',
    debugMode: 'mask',
    hint: 'paper peaks the brush skips, left bare (white), reaching further where the diffuse light is bright',
    inputs: ['substrate'],
    reads: ['diffuse'],
  },
  {
    key: 'turbulence',
    label: 'turbulence',
    kind: 'pass',
    fboKey: 'turbulence',
    debugView: 'turbulence',
    debugMode: 'signed',
    hint: 'object-space Perlin fBm: signed pigment density offset (+ more pigment, − thinner)',
    inputs: ['scene'],
  },
  {
    key: 'depth',
    label: 'depth',
    kind: 'pass',
    fboKey: 'depth',
    debugView: 'depth',
    debugMode: 'depth',
    hint: 'per-subject visible depth normalized from nearest to farthest, with coverage',
    inputs: ['scene'],
  },
  {
    key: 'sobel',
    label: 'sobel',
    kind: 'pass',
    fboKey: 'sobel',
    debugView: 'sobel',
    hint: 'continuous edge strength from depth',
    inputs: ['depth'],
  },
  {
    key: 'diffuse-composition',
    label: 'diffuse comp',
    kind: 'pass',
    fboKey: 'diffuseComposition',
    debugView: 'diffuse-composition',
    debugMode: 'composition',
    hint: 'diffuse composition: color override pigment with dilution density in alpha, mottled by pigment turbulence',
    inputs: ['color-override', 'dilution', 'turbulence'],
  },
  {
    key: 'sobel-blur',
    label: 'sobel blur',
    kind: 'pass',
    fboKey: 'sobelBlur',
    debugView: 'sobel-blur',
    hint: 'sobel edges softened by a premultiplied Gaussian blur',
    inputs: ['sobel'],
  },
  {
    key: 'diffuse-composition-blur',
    label: 'diffuse blur',
    kind: 'pass',
    fboKey: 'diffuseCompositionBlur',
    debugView: 'diffuse-composition-blur',
    debugMode: 'composition',
    hint: 'diffuse composition softened by a premultiplied Gaussian blur',
    inputs: ['diffuse-composition'],
  },
  {
    key: 'edge-darkening',
    label: 'edge darkening',
    kind: 'pass',
    fboKey: 'edgeDarkening',
    debugView: 'edge-darkening',
    debugMode: 'composition',
    hint: 'diffuse blur concentrated along blurred sobel edges: C^(1 + k·Eb)',
    inputs: ['diffuse-composition-blur', 'sobel-blur'],
  },
  {
    key: 'output',
    label: 'output',
    kind: 'output',
    debugView: 'output',
    hint: 'the finished painting: edge-darkened paint, granulated and dry-brushed on the tooth, highlights lifted, on distorted and lit paper',
    inputs: ['edge-darkening', 'specular', 'substrate', 'granulation', 'dry-brush'],
  },
];

// Matches uMode in debugFragment.frag.
export const DEBUG_MODES = {
  color: 0,
  depth: 1,
  coverage: 2,
  substrate: 3,
  composition: 4,
  signed: 5,
  mask: 6,
};

export const PIPELINE_FBO_KEYS = PIPELINE_STAGES.filter(({ fboKey }) => fboKey).map(
  ({ fboKey }) => fboKey
);

export const DEBUG_VIEWS = [
  'output',
  ...new Set(
    PIPELINE_STAGES.filter(
      ({ debugView }) => debugView && debugView !== 'output'
    ).map(({ debugView }) => debugView)
  ),
];
export const DEBUG_CHANNELS = ['rgb', 'alpha', 'rgb*a'];
// Views that own an Inspect-dependent control: the subject bounds draw over
// edge detection's views, and the height map reads the substrate's alpha.
export const BOUNDS_VIEWS = new Set(['depth', 'sobel']);
export const SUBSTRATE_VIEW = 'substrate';

export const FBO_OPTIONS = {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat,
};

export const DEPTH_FBO_OPTIONS = {
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,
  format: THREE.RGBAFormat,
  type: THREE.HalfFloatType,
};

// Premultiplied blur intermediates need more than 8 bits at low alpha.
export const BLUR_FBO_OPTIONS = { ...FBO_OPTIONS, type: THREE.HalfFloatType };
// Substrate height needs float precision for 1-texel slope differences; signed
// maps (turbulence) need negative values.
export const SIGNED_FBO_OPTIONS = { ...FBO_OPTIONS, type: THREE.HalfFloatType };
export const BLUR_MAX_TAPS = 32; // keep in sync with MAX_TAPS in gaussianBlurFragment.frag

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
// therefore owns the complete frame: captures first, then reductions, output, debug.
export const UNIFORM_SYNC_FRAME_ORDER = -1;
// After SmoothZoom (-2) and OrbitControls' update (-1) move the camera, before
// any pass: decides whether this frame repaints (see PaintingFrame).
export const PAINTING_CHECK_FRAME_ORDER = -0.5;
export const SUBSTRATE_PASS_FRAME_ORDER = 0;
export const SCENE_PASS_FRAME_ORDER = 1;
export const DEPTH_PASS_FRAME_ORDER = 2;
export const DIFFUSE_PASS_FRAME_ORDER = 3;
export const TURBULENCE_PASS_FRAME_ORDER = 3.05;
export const COLOR_OVERRIDE_PASS_FRAME_ORDER = 3.1;
export const DILUTION_PASS_FRAME_ORDER = 3.1;
export const GRANULATION_PASS_FRAME_ORDER = 4.3; // paper effects, read by output
export const DRY_BRUSH_PASS_FRAME_ORDER = 4.3;
export const DIFFUSE_COMPOSITION_PASS_FRAME_ORDER = 3.15;
export const SPECULAR_PASS_FRAME_ORDER = 3.2;
export const SOBEL_PASS_FRAME_ORDER = 4.1;
export const BLUR_PASS_FRAME_ORDER = 4.2;
export const EDGE_DARKENING_PASS_FRAME_ORDER = 4.25;
export const OUTPUT_FRAME_ORDER = 5;
export const DEBUG_VIEW_FRAME_ORDER = 6;
