import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { FBO_OPTIONS } from '../../config';
import { createFullscreenQuad, renderFullscreenQuad } from './fullscreenQuad';
import fullscreenVertex from '../../shaders/fullscreenVertex.vert?raw';
import horizontalBlurShader from '../../shaders/blurHorizontal.frag?raw';
import verticalBlurShader from '../../shaders/blurVertical.frag?raw';

/**
 * Hook that performs a two-pass Gaussian blur from inputRef to outputRef.
 * Each BlurPass/DiffuseBlurPass should use this with its own refs to avoid shared state.
 */
export function useGaussianBlur(
  inputRef,
  outputRef,
  blurStrength,
  blurIterations,
  frameOrder
) {
  const { gl, size } = useThree();
  const horizontalTarget = useFBO(size.width, size.height, FBO_OPTIONS);
  const verticalTarget = useFBO(size.width, size.height, FBO_OPTIONS);
  const quad = useMemo(() => createFullscreenQuad(), []);

  const [horizontalMat, verticalMat] = useMemo(() => {
    const createMat = (frag) =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVertex,
        fragmentShader: frag,
        uniforms: {
          tInput: { value: null },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
          uBlurStrength: { value: blurStrength },
        },
      });
    return [createMat(horizontalBlurShader), createMat(verticalBlurShader)];
  }, []);

  if (outputRef) outputRef.current = verticalTarget;

  useFrame(() => {
    const res = horizontalMat.uniforms.uResolution.value;
    res.set(size.width, size.height);
    verticalMat.uniforms.uResolution.value.copy(res);
    horizontalMat.uniforms.uBlurStrength.value = blurStrength;
    verticalMat.uniforms.uBlurStrength.value = blurStrength;
  }, -1);

  useFrame(() => {
    if (!inputRef?.current) return;
    const iterations = Math.max(1, Math.floor(blurIterations));
    const render = (mat, tex, target) => {
      mat.uniforms.tInput.value = tex;
      renderFullscreenQuad(gl, quad, mat, target);
    };
    let read = inputRef.current;
    for (let i = 0; i < iterations; i++) {
      render(horizontalMat, read.texture, horizontalTarget);
      render(verticalMat, horizontalTarget.texture, verticalTarget);
      read = verticalTarget;
    }
    gl.setRenderTarget(null);
  }, frameOrder);
}
