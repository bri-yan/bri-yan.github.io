import * as THREE from 'three';

// Shared source of truth for the debug selector and the on-screen graph.
// `inputs` names the stages whose output a stage consumes.
export const PIPELINE_STAGES = [
  {
    key: 'substrate',
    label: 'substrate',
    kind: 'source',
    fboKey: 'substrate',
    debugView: 'substrate',
    hint: 'stationary procedural paper: RGB color with height in alpha',
    inputs: [],
  },
  {
    key: 'scene',
    label: 'scene',
    kind: 'source',
    debugView: 'color',
    hint: 'the live Three.js scene',
    inputs: [],
  },
  {
    key: 'color',
    label: 'color',
    kind: 'pass',
    fboKey: 'color',
    debugView: 'color',
    hint: 'unstyled scene captured with its original materials',
    inputs: ['scene'],
  },
  {
    key: 'raw-depth',
    label: 'raw depth',
    kind: 'pass',
    fboKey: 'rawDepth',
    debugView: 'raw-depth',
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
    key: 'output',
    label: 'output',
    kind: 'output',
    debugView: 'output',
    hint: 'color composited over the background and drawn to screen',
    inputs: ['color'],
  },
  {
    key: 'normalized-depth',
    label: 'normalized depth',
    kind: 'pass',
    fboKey: 'normalizedDepth',
    debugView: 'normalized-depth',
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
];

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

export const DEFAULT_BACKGROUND_COLOR = new THREE.Color(0xffffff);
export const DEFAULT_LIGHT_POSITION = [5, 5, 5];
export const DEFAULT_DIFFUSE_AMOUNT = 1;
export const DEFAULT_COLOR_OVERRIDE_BASE_COLOR = new THREE.Color(0x00ffff);
export const DEFAULT_COLOR_OVERRIDE_SHADOW_COLOR = new THREE.Color(0x172554);
export const DEFAULT_DILUTION_STRENGTH = 0.35;
export const DEFAULT_SPECULAR_SHININESS = 32;
export const DEFAULT_SPECULAR_STRENGTH = 0.7;
export const DEFAULT_SPECULAR_THRESHOLD = 0.3;
export const DEFAULT_SOBEL_STRENGTH = 1;
export const DEFAULT_SOBEL_RADIUS = 1;
export const DEFAULT_SUBSTRATE_COLOR = new THREE.Color(0xf4f2ec);
export const DEFAULT_SUBSTRATE_SCALE = 5;
export const CANVAS_CAMERA = { position: [0, 0, 5], fov: 75 };

export const FULLSCREEN_QUAD_NDC = [-1, 1, 1, -1, 0, 1];
export const FULLSCREEN_QUAD_SIZE = 2;

// Prioritized frame callbacks disable R3F's automatic render. The pipeline
// therefore owns the complete frame: captures first, then reductions, output, debug.
export const UNIFORM_SYNC_FRAME_ORDER = -1;
export const SUBSTRATE_PASS_FRAME_ORDER = 0;
export const RAW_COLOR_PASS_FRAME_ORDER = 1;
export const RAW_DEPTH_PASS_FRAME_ORDER = 2;
export const DIFFUSE_PASS_FRAME_ORDER = 3;
export const COLOR_OVERRIDE_PASS_FRAME_ORDER = 3.1;
export const DILUTION_PASS_FRAME_ORDER = 3.1;
export const SPECULAR_PASS_FRAME_ORDER = 3.2;
export const NORMALIZED_DEPTH_FRAME_ORDER = 4;
export const SOBEL_PASS_FRAME_ORDER = 4.1;
export const OUTPUT_FRAME_ORDER = 5;
export const DEBUG_VIEW_FRAME_ORDER = 6;
