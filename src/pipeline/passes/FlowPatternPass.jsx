import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { FBO_OPTIONS } from '../../config';
import { createFullscreenQuad } from '../utils/fullscreenQuad';
import flowPatternVertex from '../../shaders/flowPatternVertex.vert?raw';
import flowPatternFragment from '../../shaders/flowPatternFragment.frag?raw';

const FLOW_PATTERN_FRAME_ORDER = 1.5;

/**
 * Reads intensity from inputRef (IntensityPass output), applies flow-pattern
 * smoothstep alpha, and outputs to outputRef.
 */
export function FlowPatternPass({
  inputRef,
  outputRef,
  threshold = 0.3,
  wetness = 0.7,
  baseOpacity = 1.0,
}) {
  const { gl, size } = useThree();
  const target = useFBO(size.width, size.height, FBO_OPTIONS);

  if (outputRef) outputRef.current = target;

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: flowPatternVertex,
        fragmentShader: flowPatternFragment,
        uniforms: {
          tIntensity: { value: null },
          uThreshold: { value: threshold },
          uWetness: { value: wetness },
          uBaseOpacity: { value: baseOpacity },
        },
      }),
    []
  );

  const { scene: quadScene, camera: quadCamera } = useMemo(
    () => createFullscreenQuad(material),
    [material]
  );

  const uniforms = material.uniforms;

  useFrame(() => {
    uniforms.uThreshold.value = threshold;
    uniforms.uWetness.value = wetness;
    uniforms.uBaseOpacity.value = baseOpacity;
  }, -1);

  useFrame(() => {
    if (!inputRef?.current) return;
    uniforms.tIntensity.value = inputRef.current.texture;
    gl.setRenderTarget(outputRef ? target : null);
    gl.clear();
    gl.render(quadScene, quadCamera);
  }, FLOW_PATTERN_FRAME_ORDER);

  return null;
}
