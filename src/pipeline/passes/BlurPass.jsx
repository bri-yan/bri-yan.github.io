import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { FBO_OPTIONS, DEFAULT_BLUR_STRENGTH, PASS_FRAME_ORDER } from '../../config';
import { createFullscreenQuad } from '../utils/fullscreenQuad';
import fullscreenVertex from '../../shaders/blurVertex.vert?raw';
import horizontalBlurShader from '../../shaders/blurHorizontal.frag?raw';
import verticalBlurShader from '../../shaders/blurVertical.frag?raw';

/** Two-pass (H + V) 9-tap Gaussian blur of inputRef texture. Output goes to outputRef FBO. */
export function BlurPass({ inputRef, outputRef, blurStrength = DEFAULT_BLUR_STRENGTH }) {
  const { gl, size } = useThree();
  const horizontalTarget = useFBO(size.width, size.height, FBO_OPTIONS);
  const verticalTarget = useFBO(size.width, size.height, FBO_OPTIONS);
  const { scene: quadScene, camera: quadCamera, mesh: quadMesh } = useMemo(
    () => createFullscreenQuad(),
    []
  );

  if (outputRef) outputRef.current = verticalTarget;

  const createBlurMaterial = (fragmentShader) =>
    new THREE.ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader,
      uniforms: {
        tInput: { value: null },
        uResolution: { value: new THREE.Vector2(size.width, size.height) },
        uBlurStrength: { value: blurStrength },
      },
    });

  const horizontalMaterial = useMemo(() => createBlurMaterial(horizontalBlurShader), []);
  const verticalMaterial = useMemo(() => createBlurMaterial(verticalBlurShader), []);

  useFrame(() => {
    const res = horizontalMaterial.uniforms.uResolution.value;
    res.set(size.width, size.height);
    horizontalMaterial.uniforms.uBlurStrength.value = blurStrength;
    verticalMaterial.uniforms.uResolution.value.copy(res);
    verticalMaterial.uniforms.uBlurStrength.value = blurStrength;
  }, -1);

  useFrame(() => {
    if (!inputRef?.current) return;
    quadMesh.material = horizontalMaterial;
    horizontalMaterial.uniforms.tInput.value = inputRef.current.texture;
    gl.setRenderTarget(horizontalTarget);
    gl.clear();
    gl.render(quadScene, quadCamera);

    quadMesh.material = verticalMaterial;
    verticalMaterial.uniforms.tInput.value = horizontalTarget.texture;
    gl.setRenderTarget(outputRef ? verticalTarget : null);
    gl.clear();
    gl.render(quadScene, quadCamera);
  }, PASS_FRAME_ORDER);

  return null;
}
