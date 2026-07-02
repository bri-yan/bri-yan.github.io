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
import horizontalBlurShader from '../../shaders/blurHorizontal.frag?raw';
import verticalBlurShader from '../../shaders/blurVertical.frag?raw';

/** Multi-iteration two-pass (H + V) 9-tap Gaussian blur. Each iteration adds one H+V pair. Output goes to outputRef FBO. */
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

  if (outputRef) outputRef.current = verticalTarget;

  const [horizontalMat, verticalMat] = useMemo(() => {
    const createBlurMaterial = (frag) =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVertex,
        fragmentShader: frag,
        uniforms: {
          tInput: { value: null },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
          uBlurStrength: { value: blurStrength },
        },
      });
    return [createBlurMaterial(horizontalBlurShader), createBlurMaterial(verticalBlurShader)];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; uniforms are synced per frame
  }, []);

  useFrame(() => {
    const res = horizontalMat.uniforms.uResolution.value;
    res.set(size.width, size.height);
    verticalMat.uniforms.uResolution.value.copy(res);
    horizontalMat.uniforms.uBlurStrength.value = blurStrength;
    verticalMat.uniforms.uBlurStrength.value = blurStrength;
  }, UNIFORM_SYNC_FRAME_ORDER);

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
  }, PASS_FRAME_ORDER);

  return null;
}
