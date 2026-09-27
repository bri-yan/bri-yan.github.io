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
    key: 'raw-depth',
    label: 'raw depth',
    kind: 'pass',
    fboKey: 'rawDepth',
    debugView: 'raw-depth',
    debugMode: 'raw-depth',
    hint: 'unnormalized linear camera-view distance with coverage',
    inputs: ['scene'],
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
    key: 'normalized-depth',
    label: 'norm. depth',
    kind: 'pass',
    fboKey: 'normalizedDepth',
    debugView: 'normalized-depth',
    debugMode: 'normalized-depth',
    hint: 'per-subject visible depth normalized from nearest to farthest',
    inputs: ['raw-depth'],
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
    key: 'sobel',
    label: 'sobel',
    kind: 'pass',
    fboKey: 'sobel',
    debugView: 'sobel',
    hint: 'continuous edge strength from normalized depth',
    inputs: ['normalized-depth'],
  },
  {
    key: 'diffuse-composition',
    label: 'diffuse comp',
    kind: 'pass',
    fboKey: 'diffuseComposition',
    debugView: 'diffuse-composition',
    debugMode: 'composition',
    hint: 'diffuse composition: color override pigment with dilution density in alpha',
    inputs: ['color-override', 'dilution'],
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
    key: 'gradient',
    label: 'gradient',
    kind: 'pass',
    fboKey: 'gradient',
    debugView: 'gradient',
    debugMode: 'signed',
    hint: 'signed substrate slope ∇h per paper unit (uphill, y screen-down)',
    inputs: ['substrate'],
  },
  {
    key: 'substrate-fx',
    label: 'substrate fx',
    kind: 'pass',
    fboKey: 'substrateFx',
    debugView: 'substrate-fx',
    hint: 'edge-darkened paint on paper, specular highlights lifted to bare paper, with toggleable substrate distortion and lighting',
    inputs: ['edge-darkening', 'gradient', 'specular'],
  },
  {
    key: 'output',
    label: 'output',
    kind: 'output',
    debugView: 'output',
    hint: 'the finished painting drawn to screen',
    inputs: ['substrate-fx'],
  },
];

// Matches uMode in debugFragment.frag.
export const DEBUG_MODES = {
  color: 0,
  'raw-depth': 1,
  'normalized-depth': 2,
  coverage: 3,
  substrate: 4,
  composition: 5,
  signed: 6,
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

export const RAW_DEPTH_FBO_OPTIONS = {
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,
  format: THREE.RGBAFormat,
  type: THREE.HalfFloatType,
};

// Premultiplied blur intermediates need more than 8 bits at low alpha.
export const BLUR_FBO_OPTIONS = { ...FBO_OPTIONS, type: THREE.HalfFloatType };
// Substrate height and its signed gradient need float precision for 1-texel differences.
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
export const GRADIENT_PASS_FRAME_ORDER = 0.1;
export const SCENE_PASS_FRAME_ORDER = 1;
export const RAW_DEPTH_PASS_FRAME_ORDER = 2;
export const DIFFUSE_PASS_FRAME_ORDER = 3;
export const COLOR_OVERRIDE_PASS_FRAME_ORDER = 3.1;
export const DILUTION_PASS_FRAME_ORDER = 3.1;
export const DIFFUSE_COMPOSITION_PASS_FRAME_ORDER = 3.15;
export const SPECULAR_PASS_FRAME_ORDER = 3.2;
export const NORMALIZED_DEPTH_FRAME_ORDER = 4;
export const SOBEL_PASS_FRAME_ORDER = 4.1;
export const BLUR_PASS_FRAME_ORDER = 4.2;
export const EDGE_DARKENING_PASS_FRAME_ORDER = 4.25;
export const SUBSTRATE_FX_PASS_FRAME_ORDER = 4.3;
export const OUTPUT_FRAME_ORDER = 5;
export const DEBUG_VIEW_FRAME_ORDER = 6;
