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

// —— Pipeline default weights ——
export const DEFAULT_RAW_WEIGHT = 1.0;
export const DEFAULT_BLINN_PHONG_WEIGHT = 0;
export const DEFAULT_BLUR_WEIGHT = 0;
export const DEFAULT_BLUR_STRENGTH = 2.0;

// —— Canvas / scene ——
export const CANVAS_CAMERA = { position: [0, 0, 5], fov: 75 };
export const BACKGROUND_COLOR = '#ffffff';

// —— Fullscreen quad (NDC for orthographic camera) ——
export const FULLSCREEN_QUAD_NDC = [-1, 1, 1, -1, 0, 1];
export const FULLSCREEN_QUAD_SIZE = 2;

// —— useFrame order (higher = later) ——
export const PASS_FRAME_ORDER = 1;
export const COMPOSITOR_FRAME_ORDER = 2;
