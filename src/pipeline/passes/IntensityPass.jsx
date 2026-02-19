import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { FBO_OPTIONS, PASS_FRAME_ORDER } from '../../config';
import { populateSceneWithClonedMeshes } from '../utils/sceneWithMaterials';
import intensityVertexShader from '../../shaders/intensityVertex.vert?raw';
import intensityFragmentShader from '../../shaders/intensityFragment.frag?raw';

/**
 * Renders the scene using the intensity vertex/fragment shaders to an FBO.
 * Outputs intensity (RGB) for downstream FlowPatternPass.
 */
export function IntensityPass({ outputRef }) {
  const { gl, scene, camera, size } = useThree();
  const target = useFBO(size.width, size.height, FBO_OPTIONS);
  const customScene = useMemo(() => new THREE.Scene(), []);
  const materialsCache = useRef(new Map());
  const savedClearColor = useRef(new THREE.Color());
  const savedClearAlpha = useRef(1);

  if (outputRef) outputRef.current = target;

  const getMaterial = useMemo(
    () => () =>
      new THREE.ShaderMaterial({
        vertexShader: intensityVertexShader,
        fragmentShader: intensityFragmentShader,
      }),
    []
  );

  useFrame(() => {
    populateSceneWithClonedMeshes(scene, customScene, getMaterial, materialsCache.current);

    gl.setRenderTarget(target);
    gl.getClearColor(savedClearColor.current);
    savedClearAlpha.current = gl.getClearAlpha();
    gl.clear();
    gl.render(customScene, camera);
    gl.setClearColor(savedClearColor.current, savedClearAlpha.current);
    gl.setRenderTarget(null);
  }, PASS_FRAME_ORDER);

  return null;
}
