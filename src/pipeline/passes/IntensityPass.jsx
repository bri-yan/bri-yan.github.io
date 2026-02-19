import { useMemo } from 'react';
import * as THREE from 'three';
import { useSceneRenderPass } from '../utils/sceneWithMaterials';
import fullscreenVertex from '../../shaders/fullscreenVertex.vert?raw';
import intensityFragmentShader from '../../shaders/intensityFragment.frag?raw';

/** Renders the scene with intensity shader to an FBO for downstream passes. */
export function IntensityPass({ outputRef }) {
  const getMaterial = useMemo(
    () => () =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVertex,
        fragmentShader: intensityFragmentShader,
      }),
    []
  );
  const target = useSceneRenderPass(getMaterial);
  if (outputRef) outputRef.current = target;
  return null;
}
