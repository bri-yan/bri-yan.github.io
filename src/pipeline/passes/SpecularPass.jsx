import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { FBO_OPTIONS, SPECULAR_PASS_FRAME_ORDER } from '../../config';
import { renderSceneWithOverride } from '../utils/renderSceneWithOverride';
import lightingVertex from '../../shaders/lightingVertex.vert?raw';
import specularFragment from '../../shaders/specularFragment.frag?raw';

/** Captures a thresholded Blinn–Phong highlight mask. */
export function SpecularPass({ outputRef, lightPosition, shininess, strength, threshold }) {
  const { gl, scene, camera } = useThree();
  const target = useFBO(FBO_OPTIONS);
  const savedClearColor = useRef(new THREE.Color()).current;
  const lightPositionView = useMemo(() => new THREE.Vector3(), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: lightingVertex,
        fragmentShader: specularFragment,
        uniforms: {
          uLightPositionView: { value: new THREE.Vector3() },
          uShininess: { value: 0 },
          uStrength: { value: 0 },
          uThreshold: { value: 0 },
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
    material.uniforms.uShininess.value = shininess;
    material.uniforms.uStrength.value = strength;
    material.uniforms.uThreshold.value = threshold;
    renderSceneWithOverride(gl, scene, camera, target, material, savedClearColor);
  }, SPECULAR_PASS_FRAME_ORDER);

  return null;
}
