import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import {
  FBO_OPTIONS,
  PASS_FRAME_ORDER,
  UNIFORM_SYNC_FRAME_ORDER,
  DEFAULT_BLUR_STRENGTH,
  DEFAULT_BLUR_ITERATIONS,
} from '../../config';
import { createFullscreenQuad, renderFullscreenQuad } from '../utils/fullscreenQuad';
import fullscreenVertex from '../../shaders/fullscreenVertex.vert?raw';
import blurFragment from '../../shaders/blur.frag?raw';

const HORIZONTAL = new THREE.Vector2(1, 0);
const VERTICAL = new THREE.Vector2(0, 1);

/**
 * Multi-iteration separable Gaussian blur: each iteration is one horizontal
 * + one vertical 1-D pass of the same shader, ping-ponging between two FBOs.
 * The final vertical target is the pass output.
 */
export function BlurPass({
  inputRef,
  outputRef,
  blurStrength = DEFAULT_BLUR_STRENGTH,
  blurIterations = DEFAULT_BLUR_ITERATIONS,
}) {
  const { gl, size } = useThree();
  const horizontalTarget = useFBO(size.width, size.height, FBO_OPTIONS);
  const verticalTarget = useFBO(size.width, size.height, FBO_OPTIONS);
  const quad = useMemo(() => createFullscreenQuad(), []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVertex,
        fragmentShader: blurFragment,
        uniforms: {
          tInput: { value: null },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
          uDirection: { value: HORIZONTAL.clone() },
          uBlurStrength: { value: blurStrength },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; uniforms are synced per frame
    []
  );

  if (outputRef) outputRef.current = verticalTarget;

  useFrame(() => {
    material.uniforms.uResolution.value.set(size.width, size.height);
    material.uniforms.uBlurStrength.value = blurStrength;
  }, UNIFORM_SYNC_FRAME_ORDER);

  useFrame(() => {
    if (!inputRef?.current) return;
    const u = material.uniforms;
    const iterations = Math.max(1, Math.floor(blurIterations));
    let read = inputRef.current.texture;
    for (let i = 0; i < iterations; i++) {
      u.uDirection.value.copy(HORIZONTAL);
      u.tInput.value = read;
      renderFullscreenQuad(gl, quad, material, horizontalTarget);
      u.uDirection.value.copy(VERTICAL);
      u.tInput.value = horizontalTarget.texture;
      renderFullscreenQuad(gl, quad, material, verticalTarget);
      read = verticalTarget.texture;
    }
  }, PASS_FRAME_ORDER);

  return null;
}
