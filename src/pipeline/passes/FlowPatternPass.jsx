import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { FBO_OPTIONS, FLOW_PATTERN_FRAME_ORDER } from '../../config';
import { createFullscreenQuad, renderFullscreenQuad } from '../utils/fullscreenQuad';
import fullscreenVertex from '../../shaders/fullscreenVertex.vert?raw';
import flowPatternFragment from '../../shaders/flowPatternFragment.frag?raw';

/**
 * Reads intensity from inputRef (IntensityPass output), applies flow-pattern
 * smoothstep alpha, and outputs to outputRef.
 */
export function FlowPatternPass({
  inputRef,
  outputRef,
  baseColor,
  threshold,
  wetness,
  edgeDarkness,
  baseOpacity,
}) {
  const { gl, size } = useThree();
  const target = useFBO(size.width, size.height, FBO_OPTIONS);

  if (outputRef) outputRef.current = target;

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVertex,
        fragmentShader: flowPatternFragment,
        uniforms: {
          tIntensity: { value: null },
          uBaseColor: { value: baseColor },
          uBaseOpacity: { value: baseOpacity },
          uThreshold: { value: threshold },
          uWetness: { value: wetness },
          uEdgeDarkness: { value: edgeDarkness },
        },
      }),
    []
  );

  const quad = useMemo(() => createFullscreenQuad(material), [material]);
  const uniforms = material.uniforms;

  useFrame(() => {
    uniforms.uBaseColor.value = baseColor;
    uniforms.uThreshold.value = threshold;
    uniforms.uWetness.value = wetness;
    uniforms.uBaseOpacity.value = baseOpacity;
    uniforms.uEdgeDarkness.value = edgeDarkness;
  }, -1);

  useFrame(() => {
    if (!inputRef?.current) return;
    uniforms.tIntensity.value = inputRef.current.texture;
    renderFullscreenQuad(gl, quad, material, outputRef ? target : null);
  }, FLOW_PATTERN_FRAME_ORDER);

  return null;
}
