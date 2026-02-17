import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  DEFAULT_BLINN_PHONG_WEIGHT,
  DEFAULT_BLUR_WEIGHT,
  BLEND_MODE,
} from '../constants';
import { createFullscreenQuad } from '../utils/fullscreenQuad';
import fullscreenVertex from '../shaders/blurVertex.vert?raw';
import compositorFragmentShader from '../shaders/compositorFragment.frag?raw';

/**
 * Composites BlinnPhong and Blur FBOs into the final image.
 */
export function CompositorPass({
  blinnPhongRef,
  blurRef,
  blinnPhongWeight = DEFAULT_BLINN_PHONG_WEIGHT,
  blurWeight = DEFAULT_BLUR_WEIGHT,
  blendMode = BLEND_MODE.ADDITIVE,
}) {
  const { gl } = useThree();

  const compositorMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVertex,
        fragmentShader: compositorFragmentShader,
        uniforms: {
          tBlinnPhong: { value: null },
          tBlur: { value: null },
          uBlinnPhongWeight: { value: blinnPhongWeight },
          uBlurWeight: { value: blurWeight },
          uBlendMode: { value: blendMode },
        },
      }),
    []
  );

  const { scene: quadScene, camera: quadCamera } = useMemo(
    () => createFullscreenQuad(compositorMaterial),
    [compositorMaterial]
  );

  // Update uniforms from props
  useFrame(() => {
    compositorMaterial.uniforms.uBlinnPhongWeight.value = blinnPhongWeight;
    compositorMaterial.uniforms.uBlurWeight.value = blurWeight;
    compositorMaterial.uniforms.uBlendMode.value = blendMode;
  }, -1);

  useFrame(() => {
    // Get textures from refs
    if (blinnPhongRef?.current && blurRef?.current) {
      compositorMaterial.uniforms.tBlinnPhong.value = blinnPhongRef.current.texture;
      compositorMaterial.uniforms.tBlur.value = blurRef.current.texture;

      gl.setRenderTarget(null);
      gl.clear();
      gl.render(quadScene, quadCamera);
    }
  }, 2); // Render last, after all passes

  return null;
}
