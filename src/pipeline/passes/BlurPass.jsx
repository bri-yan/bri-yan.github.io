import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { FBO_OPTIONS, PASS_FRAME_ORDER, DEFAULT_BLUR_STRENGTH, DEFAULT_BLUR_ITERATIONS } from '../../config';
import { createFullscreenQuad } from '../utils/fullscreenQuad';
import fullscreenVertex from '../../shaders/blurVertex.vert?raw';
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
    verticalMaterial.uniforms.uResolution.value.copy(res);
    horizontalMaterial.uniforms.uBlurStrength.value = blurStrength;
    verticalMaterial.uniforms.uBlurStrength.value = blurStrength;
  }, -1);

  useFrame(() => {
    if (!inputRef?.current) return;
    const iterations = Math.max(1, Math.floor(blurIterations));
    let readTarget = inputRef.current;

    for (let i = 0; i < iterations; i++) {
      quadMesh.material = horizontalMaterial;
      horizontalMaterial.uniforms.tInput.value = readTarget.texture;
      gl.setRenderTarget(horizontalTarget);
      gl.clear();
      gl.render(quadScene, quadCamera);

      quadMesh.material = verticalMaterial;
      verticalMaterial.uniforms.tInput.value = horizontalTarget.texture;
      gl.setRenderTarget(verticalTarget);
      gl.clear();
      gl.render(quadScene, quadCamera);

      readTarget = verticalTarget;
    }
  }, PASS_FRAME_ORDER);

  return null;
}
