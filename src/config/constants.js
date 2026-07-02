import * as THREE from 'three';

// —— FBO (render targets) ——
export const FBO_OPTIONS = {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat,
};

// —— Pipeline weights ——
export const DEFAULT_FLOW_PATTERN_WEIGHT = 1.0;
export const DEFAULT_DIFFUSE_WEIGHT = 1.0;
export const DEFAULT_SPECULAR_WEIGHT = 1.0;
export const DEFAULT_PAPER_WEIGHT = 0.1;
export const DEFAULT_BLUR_WEIGHT = 0.0;

// —— Blur defaults ——
export const DEFAULT_BLUR_STRENGTH = 1.0;
export const DEFAULT_BLUR_ITERATIONS = 5;

// —— Flow pattern defaults ——
export const DEFAULT_FLOW_PATTERN_BASE_COLOR = new THREE.Color(0x00ffff);
export const DEFAULT_FLOW_PATTERN_THRESHOLD = 0.3;
export const DEFAULT_FLOW_PATTERN_EDGE_DARKNESS = 0.3;
// Reserved: plumbed through to the shader but not yet used by it.
export const DEFAULT_FLOW_PATTERN_BASE_OPACITY = 1.0;
export const DEFAULT_FLOW_PATTERN_EDGE_SHARPNESS = 80.0;

// —— Blinn-Phong defaults ——
export const DEFAULT_BLINN_PHONG_LIGHT_POSITION = [5, 5, 5];
export const DEFAULT_BLINN_PHONG_SHININESS = 32;
export const DEFAULT_BLINN_PHONG_AMBIENT_STRENGTH = 0.5;
export const DEFAULT_BLINN_PHONG_DIFFUSE_STRENGTH = 0.5;
export const DEFAULT_BLINN_PHONG_SPECULAR_STRENGTH = 0.7;
export const DEFAULT_BLINN_PHONG_SPECULAR_THRESHOLD = 0.3;

// —— Paper texture defaults ——
export const DEFAULT_PAPER_REPEAT_X = 1.0;
export const DEFAULT_PAPER_REPEAT_Y = 1.0;

// —— Compositor ——
// White matches the page background that used to show through the transparent canvas.
export const DEFAULT_COMPOSITOR_BACKGROUND = 0xffffff;
// diffuse.a (inverse-light wash) peaks well below 1; this gain rescales it toward full brightness.
export const DEFAULT_COMPOSITOR_DIFFUSE_GAIN = 2.5;

// —— Debug view ——
// 'final' shows the compositor output; every other entry names a pass FBO in MultiPassPipeline.
export const DEBUG_VIEWS = [
  'final',
  'intensity',
  'blur',
  'flowPattern',
  'diffuse',
  'diffuseBlur',
  'specular',
  'paper',
];
// Uniform index = position in this list.
export const DEBUG_CHANNELS = ['rgb', 'alpha', 'rgb*a'];

// —— Canvas / scene ——
export const CANVAS_CAMERA = { position: [0, 0, 5], fov: 75 };

// —— Fullscreen quad (NDC for orthographic camera) ——
export const FULLSCREEN_QUAD_NDC = [-1, 1, 1, -1, 0, 1];
export const FULLSCREEN_QUAD_SIZE = 2;

// —— useFrame order (higher = later) ——
export const UNIFORM_SYNC_FRAME_ORDER = -1;
export const PASS_FRAME_ORDER = 1;
export const FLOW_PATTERN_FRAME_ORDER = 1.5;
export const COMPOSITOR_FRAME_ORDER = 2;
export const DEBUG_VIEW_FRAME_ORDER = 3;
