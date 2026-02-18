import * as THREE from 'three';

/**
 * Populates targetScene with clones of all meshes from sourceScene, each using
 * a material from the cache or from getMaterial(originalMaterial).
 * @param {THREE.Scene} sourceScene
 * @param {THREE.Scene} targetScene
 * @param {(material: THREE.Material) => THREE.Material} getMaterial
 * @param {Map<string, THREE.Material>} cache - keyed by source mesh uuid
 */
export function populateSceneWithClonedMeshes(sourceScene, targetScene, getMaterial, cache) {
  targetScene.children.length = 0;
  sourceScene.traverse((child) => {
    if (!child.isMesh || child === targetScene) return;
    const cloned = child.clone();
    const key = child.uuid;
    if (!cache.has(key)) cache.set(key, getMaterial(child.material));
    cloned.material = cache.get(key);
    targetScene.add(cloned);
  });
}
