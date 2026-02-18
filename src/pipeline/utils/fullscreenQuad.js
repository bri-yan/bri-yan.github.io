import * as THREE from 'three';
import { FULLSCREEN_QUAD_NDC, FULLSCREEN_QUAD_SIZE } from '../../config';

/**
 * Creates a fullscreen quad (scene + ortho camera + plane mesh) for post-process passes.
 * Caller sets mesh.material; mesh can be reused (e.g. to swap materials).
 */
export function createFullscreenQuad(initialMaterial = null) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(...FULLSCREEN_QUAD_NDC);
  const geometry = new THREE.PlaneGeometry(FULLSCREEN_QUAD_SIZE, FULLSCREEN_QUAD_SIZE);
  const mesh = new THREE.Mesh(geometry, initialMaterial);
  scene.add(mesh);
  return { scene, camera, mesh };
}
