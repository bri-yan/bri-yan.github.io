import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { FBO_OPTIONS, PASS_FRAME_ORDER } from '../../config';

/**
 * Populates targetScene with clones of all meshes from sourceScene, each using
 * a material from the cache or from getMaterial(originalMaterial).
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

/**
 * Hook for passes that render the main scene with custom materials (e.g. IntensityPass, BlinnPhongPass).
 * Returns target FBO ref for outputRef assignment.
 * @param getMaterial - Factory that returns a material per mesh
 * @param cacheKey - When this changes, the materials cache is cleared (use shader source for HMR)
 */
export function useSceneRenderPass(getMaterial, cacheKey) {
  const { gl, scene, camera, size } = useThree();
  const target = useFBO(size.width, size.height, FBO_OPTIONS);
  const customScene = useMemo(() => new THREE.Scene(), []);
  const materialsCache = useRef(new Map());
  const prevCacheKey = useRef(cacheKey);
  if (prevCacheKey.current !== cacheKey) {
    materialsCache.current.clear();
    prevCacheKey.current = cacheKey;
  }
  const savedClearColor = useRef(new THREE.Color());
  const savedClearAlpha = useRef(1);

  useFrame(() => {
    populateSceneWithClonedMeshes(scene, customScene, getMaterial, materialsCache.current);
    gl.getClearColor(savedClearColor.current);
    savedClearAlpha.current = gl.getClearAlpha();
    gl.setRenderTarget(target);
    gl.clear();
    gl.render(customScene, camera);
    gl.setRenderTarget(null);
    gl.setClearColor(savedClearColor.current, savedClearAlpha.current);
  }, PASS_FRAME_ORDER);

  return target;
}
