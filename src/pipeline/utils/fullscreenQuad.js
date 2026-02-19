import * as THREE from 'three';
import { FULLSCREEN_QUAD_NDC, FULLSCREEN_QUAD_SIZE } from '../../config';

/** Creates a fullscreen quad (scene + ortho camera + mesh) for post-process passes. Caller sets mesh.material. */
export function createFullscreenQuad(initialMaterial = null) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(...FULLSCREEN_QUAD_NDC);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(FULLSCREEN_QUAD_SIZE, FULLSCREEN_QUAD_SIZE),
    initialMaterial
  );
  scene.add(mesh);
  return { scene, camera, mesh };
}

/** Renders a fullscreen quad with the given material to the target (null = screen). */
export function renderFullscreenQuad(gl, { scene, camera, mesh }, material, target) {
  mesh.material = material;
  gl.setRenderTarget(target);
  gl.clear();
  gl.render(scene, camera);
}
