import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { FBO_OPTIONS, DEFAULT_BLUR_STRENGTH } from '../constants';
import { createFullscreenQuad } from '../utils/fullscreenQuad';
import fullscreenVertex from '../shaders/blurVertex.vert?raw';
import horizontalBlurShader from '../shaders/blurHorizontal.frag?raw';
import verticalBlurShader from '../shaders/blurVertical.frag?raw';

/**
 * Renders scene to FBO, then two-pass (H + V) 9-tap Gaussian blur.
 * If outputRef is provided, blur output goes to that FBO; otherwise to screen.
 */
export function BlurPass({ children, outputRef, blurStrength = DEFAULT_BLUR_STRENGTH }) {
  const { gl, scene, camera, size } = useThree();

  const offscreenTarget = useFBO(size.width, size.height, FBO_OPTIONS);
  const horizontalTarget = useFBO(size.width, size.height, FBO_OPTIONS);
  const verticalTarget = useFBO(size.width, size.height, FBO_OPTIONS);

  if (outputRef) outputRef.current = verticalTarget;

  const { scene: quadScene, camera: quadCamera, mesh: quadMesh } = useMemo(
    () => createFullscreenQuad(),
    []
  );

  const horizontalMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVertex,
        fragmentShader: horizontalBlurShader,
        uniforms: {
          tDiffuse: { value: null },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
          uBlurStrength: { value: blurStrength },
        },
      }),
    []
  );

  const verticalMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVertex,
        fragmentShader: verticalBlurShader,
        uniforms: {
          tDiffuse: { value: null },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
          uBlurStrength: { value: blurStrength },
        },
      }),
    []
  );

  useFrame(() => {
    horizontalMaterial.uniforms.uResolution.value.set(size.width, size.height);
    horizontalMaterial.uniforms.uBlurStrength.value = blurStrength;
    verticalMaterial.uniforms.uResolution.value.set(size.width, size.height);
    verticalMaterial.uniforms.uBlurStrength.value = blurStrength;
  }, -1);

  useFrame(() => {
    gl.setRenderTarget(offscreenTarget);
    gl.clear();
    gl.render(scene, camera);

    quadMesh.material = horizontalMaterial;
    horizontalMaterial.uniforms.tDiffuse.value = offscreenTarget.texture;
    gl.setRenderTarget(horizontalTarget);
    gl.clear();
    gl.render(quadScene, quadCamera);

    quadMesh.material = verticalMaterial;
    verticalMaterial.uniforms.tDiffuse.value = horizontalTarget.texture;
    gl.setRenderTarget(outputRef ? verticalTarget : null);
    gl.clear();
    gl.render(quadScene, quadCamera);
  }, 1);

  return <>{children}</>;
}
