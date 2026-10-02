import * as THREE from 'three';

// Shared source of truth for the debug selector, debug sources, and the on-screen graph.
// `inputs` names the stages whose output a stage consumes. `debugMode` picks the
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
    hint: 'the finished painting: edge-darkened paint, highlights lifted, on distorted and lit paper',
    inputs: ['edge-darkening', 'specular', 'substrate'],
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
export const DEFAULT_SOBEL_STRENGTH = 2.06;
export const DEFAULT_SOBEL_RADIUS = 1;
export const DEFAULT_SUBSTRATE_COLOR = new THREE.Color(0xf7f1ec);
export const DEFAULT_SUBSTRATE_SCALE = 2.5;
export const DEFAULT_COMPOSITION_BLUR_RADIUS = 12; // CSS pixels, ≈3σ
export const DEFAULT_SOBEL_BLUR_RADIUS = 10;
export const BLUR_MAX_RADIUS = 16;
export const DEFAULT_TURBULENCE_INTENSITY = 0.5;
export const DEFAULT_TURBULENCE_SCALE = 1.5; // noise cycles per object unit
export const DEFAULT_TURBULENCE_OCTAVES = 3;
export const TURBULENCE_MAX_OCTAVES = 6; // keep in sync with MAX_OCTAVES in turbulenceFragment.frag
export const DEFAULT_TURBULENCE_WARP = 0;
export const DEFAULT_EDGE_DARKENING = 3; // k in Ed = k·Eb
export const DEFAULT_SUBSTRATE_DISTORTION = 4; // CSS pixels per unit slope
export const DEFAULT_SUBSTRATE_LIGHT_ANGLE = 66; // degrees, counter-clockwise from the right
export const DEFAULT_SUBSTRATE_LIGHT_STRENGTH = 0.16;
export const DEFAULT_SUBSTRATE_ROUGHNESS = 0.65;
export const CANVAS_CAMERA = { position: [0, 0, 5], fov: 75 };

export const FULLSCREEN_QUAD_NDC = [-1, 1, 1, -1, 0, 1];
export const FULLSCREEN_QUAD_SIZE = 2;

// Prioritized frame callbacks disable R3F's automatic render. The pipeline
// therefore owns the complete frame: captures first, then reductions, output, debug.
export const UNIFORM_SYNC_FRAME_ORDER = -1;
export const SUBSTRATE_PASS_FRAME_ORDER = 0;
export const SCENE_PASS_FRAME_ORDER = 1;
export const DEPTH_PASS_FRAME_ORDER = 2;
export const DIFFUSE_PASS_FRAME_ORDER = 3;
export const TURBULENCE_PASS_FRAME_ORDER = 3.05;
export const COLOR_OVERRIDE_PASS_FRAME_ORDER = 3.1;
export const DILUTION_PASS_FRAME_ORDER = 3.1;
export const DIFFUSE_COMPOSITION_PASS_FRAME_ORDER = 3.15;
export const SPECULAR_PASS_FRAME_ORDER = 3.2;
export const SOBEL_PASS_FRAME_ORDER = 4.1;
export const BLUR_PASS_FRAME_ORDER = 4.2;
export const EDGE_DARKENING_PASS_FRAME_ORDER = 4.25;
export const OUTPUT_FRAME_ORDER = 5;
export const DEBUG_VIEW_FRAME_ORDER = 6;
