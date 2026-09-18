/** Render a scene to a target with one temporary override material. */
export function renderSceneWithOverride(gl, scene, camera, target, material, savedClearColor) {
  const previousTarget = gl.getRenderTarget();
  const previousOverride = scene.overrideMaterial;
  const previousClearAlpha = gl.getClearAlpha();
  gl.getClearColor(savedClearColor);

  scene.overrideMaterial = material;
  gl.setRenderTarget(target);
  gl.setClearColor(0x000000, 0);
  gl.clear(true, true, true);
  gl.render(scene, camera);

  scene.overrideMaterial = previousOverride;
  gl.setRenderTarget(previousTarget);
  gl.setClearColor(savedClearColor, previousClearAlpha);
}
