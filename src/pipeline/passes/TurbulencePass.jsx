import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { SIGNED_FBO_OPTIONS, TURBULENCE_PASS_FRAME_ORDER } from '../../config';
import { renderSceneWithOverride } from '../utils/renderSceneWithOverride';
import turbulenceVertex from '../../shaders/turbulenceVertex.vert?raw';
import turbulenceFragment from '../../shaders/turbulenceFragment.frag?raw';

/** Captures object-space Perlin fBm as a signed pigment density offset (R), with coverage. */
export function TurbulencePass({ outputRef, scale, octaves, warp }) {
  const { gl, scene, camera } = useThree();
  const target = useFBO(SIGNED_FBO_OPTIONS);
  const savedClearColor = useRef(new THREE.Color()).current;
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: turbulenceVertex,
        fragmentShader: turbulenceFragment,
        uniforms: {
          uScale: { value: 1 },
          uOctaves: { value: 1 },
          uWarp: { value: 0 },
        },
      }),
    []
  );

  if (outputRef) outputRef.current = target;

  useFrame(() => {
    material.uniforms.uScale.value = scale;
    material.uniforms.uOctaves.value = Math.round(octaves);
    material.uniforms.uWarp.value = warp;
    renderSceneWithOverride(gl, scene, camera, target, material, savedClearColor);
  }, TURBULENCE_PASS_FRAME_ORDER);

  return null;
}
