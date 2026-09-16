import * as THREE from 'three';

// Shared source of truth for the debug selector and the on-screen graph.
// `inputs` names the stages whose output a stage consumes.
export const PIPELINE_STAGES = [
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
];

export const PIPELINE_FBO_KEYS = PIPELINE_STAGES.filter(
  ({ kind }) => kind === 'pass'
).map(({ fboKey }) => fboKey);

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
export const CANVAS_CAMERA = { position: [0, 0, 5], fov: 75 };

export const FULLSCREEN_QUAD_NDC = [-1, 1, 1, -1, 0, 1];
export const FULLSCREEN_QUAD_SIZE = 2;

// Prioritized frame callbacks disable R3F's automatic render. The pipeline
// therefore owns the complete frame: captures first, then reductions, output, debug.
export const UNIFORM_SYNC_FRAME_ORDER = -1;
export const RAW_COLOR_PASS_FRAME_ORDER = 1;
export const RAW_DEPTH_PASS_FRAME_ORDER = 2;
export const SUBJECT_RANGE_FRAME_ORDER = 3;
export const NORMALIZED_DEPTH_FRAME_ORDER = 4;
export const OUTPUT_FRAME_ORDER = 5;
export const DEBUG_VIEW_FRAME_ORDER = 6;
