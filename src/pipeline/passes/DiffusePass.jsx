import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { DIFFUSE_PASS_FRAME_ORDER, FBO_OPTIONS } from '../../config';
import { renderSceneWithOverride } from '../utils/renderSceneWithOverride';
import lightingVertex from '../../shaders/lightingVertex.vert?raw';
import diffuseFragment from '../../shaders/diffuseFragment.frag?raw';

/** Captures the scene's flat-to-Lambert grayscale response. */
export function DiffusePass({ outputRef, lightPosition, diffuseAmount }) {
  const { gl, scene, camera } = useThree();
  const target = useFBO(FBO_OPTIONS);
  const savedClearColor = useRef(new THREE.Color()).current;
  const lightPositionView = useMemo(() => new THREE.Vector3(), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: lightingVertex,
        fragmentShader: diffuseFragment,
        uniforms: {
          uLightPositionView: { value: new THREE.Vector3() },
          uDiffuseAmount: { value: 0 },
        },
      }),
    []
  );

  if (outputRef) outputRef.current = target;

  useFrame(() => {
    camera.updateMatrixWorld();
    if (Array.isArray(lightPosition)) lightPositionView.fromArray(lightPosition);
    else lightPositionView.copy(lightPosition);
    lightPositionView.applyMatrix4(camera.matrixWorldInverse);
    material.uniforms.uLightPositionView.value.copy(lightPositionView);
    material.uniforms.uDiffuseAmount.value = diffuseAmount;
    renderSceneWithOverride(gl, scene, camera, target, material, savedClearColor);
  }, DIFFUSE_PASS_FRAME_ORDER);

  return null;
}
