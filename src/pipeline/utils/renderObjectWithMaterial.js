/** Render a mesh or group with one temporary material, then restore it. */
export function renderObjectWithMaterial(gl, object, camera, material) {
  const originals = [];
  object.traverse((child) => {
    if (!child.isMesh) return;
    originals.push([child, child.material]);
    child.material = material;
  });

  gl.render(object, camera);
  originals.forEach(([child, original]) => {
    child.material = original;
  });
}
