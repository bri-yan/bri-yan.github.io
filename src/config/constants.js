import * as THREE from 'three';

// —— FBO (render targets) ——
export const FBO_OPTIONS = {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat,
};

// —— Compositor blend modes ——
export const BLEND_MODE = {
  ADDITIVE: 0,
  MULTIPLY: 1,
  SCREEN: 2,
};

// —— Pipeline weights ——
export const DEFAULT_FLOW_PATTERN_WEIGHT = 1.0;
export const DEFAULT_BLINN_PHONG_WEIGHT = 0.0;
export const DEFAULT_PAPER_WEIGHT = 0.6;
export const DEFAULT_BLUR_WEIGHT = 0.0;

// —— Blur defaults ——
export const DEFAULT_BLUR_STRENGTH = 2.5;
export const DEFAULT_BLUR_ITERATIONS = 25;

// —— Flow pattern defaults ——
export const DEFAULT_FLOW_PATTERN_BASE_COLOR = 0x00ffff;
export const DEFAULT_FLOW_PATTERN_BASE_OPACITY = 1.0;
export const DEFAULT_FLOW_PATTERN_THRESHOLD = 0.4;
export const DEFAULT_FLOW_PATTERN_EDGE_DARKNESS = 0.3;
export const DEFAULT_FLOW_PATTERN_EDGE_SHARPNESS = 80.0;

// —— Paper texture defaults ——
export const DEFAULT_PAPER_REPEAT_X = 1.0;
export const DEFAULT_PAPER_REPEAT_Y = 1.0;

// —— Canvas / scene ——
export const CANVAS_CAMERA = { position: [0, 0, 5], fov: 75 };
export const BACKGROUND_COLOR = '#555555';

// —— Fullscreen quad (NDC for orthographic camera) ——
export const FULLSCREEN_QUAD_NDC = [-1, 1, 1, -1, 0, 1];
export const FULLSCREEN_QUAD_SIZE = 2;

// —— useFrame order (higher = later) ——
export const PASS_FRAME_ORDER = 1;
export const FLOW_PATTERN_FRAME_ORDER = 1.5;
export const COMPOSITOR_FRAME_ORDER = 2;
