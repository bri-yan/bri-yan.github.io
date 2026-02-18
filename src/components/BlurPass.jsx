import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { FBO_OPTIONS, DEFAULT_BLUR_STRENGTH, PASS_FRAME_ORDER } from '../constants';
import { createFullscreenQuad } from '../utils/fullscreenQuad';
import fullscreenVertex from '../shaders/blurVertex.vert?raw';
import horizontalBlurShader from '../shaders/blurHorizontal.frag?raw';
import verticalBlurShader from '../shaders/blurVertical.frag?raw';

/** Renders scene to FBO, then two-pass (H + V) 9-tap Gaussian blur. Output goes to outputRef FBO or screen. */
export function BlurPass({ outputRef, blurStrength = DEFAULT_BLUR_STRENGTH }) {
  const { gl, scene, camera, size } = useThree();

  const offscreenTarget = useFBO(size.width, size.height, FBO_OPTIONS);
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
        tDiffuse: { value: null },
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
  }, PASS_FRAME_ORDER);

  return null;
}
