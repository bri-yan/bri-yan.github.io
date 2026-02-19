import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  DEFAULT_FLOW_PATTERN_WEIGHT,
  DEFAULT_BLINN_PHONG_WEIGHT,
  DEFAULT_BLUR_WEIGHT,
  BLEND_MODE,
  COMPOSITOR_FRAME_ORDER,
} from '../../config';
import { createFullscreenQuad, renderFullscreenQuad } from '../utils/fullscreenQuad';
import fullscreenVertex from '../../shaders/fullscreenVertex.vert?raw';
import compositorFragmentShader from '../../shaders/compositorFragment.frag?raw';

/** Composites FlowPattern, BlinnPhong and Blur FBOs into the final image. */
export function CompositorPass({
  flowPatternRef,
  blinnPhongRef,
  blurRef,
  flowPatternWeight = DEFAULT_FLOW_PATTERN_WEIGHT,
  blinnPhongWeight = DEFAULT_BLINN_PHONG_WEIGHT,
  blurWeight = DEFAULT_BLUR_WEIGHT,
  blendMode = BLEND_MODE.ADDITIVE,
}) {
  const { gl } = useThree();

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVertex,
        fragmentShader: compositorFragmentShader,
        uniforms: {
          tFlowPattern: { value: null },
          tBlinnPhong: { value: null },
          tBlur: { value: null },
          uFlowPatternWeight: { value: flowPatternWeight },
          uBlinnPhongWeight: { value: blinnPhongWeight },
          uBlurWeight: { value: blurWeight },
          uBlendMode: { value: blendMode },
        },
      }),
    []
  );

  const quad = useMemo(() => createFullscreenQuad(material), [material]);
  const uniforms = material.uniforms;

  useFrame(() => {
    uniforms.uFlowPatternWeight.value = flowPatternWeight;
    uniforms.uBlinnPhongWeight.value = blinnPhongWeight;
    uniforms.uBlurWeight.value = blurWeight;
    uniforms.uBlendMode.value = blendMode;
  }, -1);

  useFrame(() => {
    if (!flowPatternRef?.current || !blinnPhongRef?.current || !blurRef?.current) return;
    uniforms.tFlowPattern.value = flowPatternRef.current.texture;
    uniforms.tBlinnPhong.value = blinnPhongRef.current.texture;
    uniforms.tBlur.value = blurRef.current.texture;
    renderFullscreenQuad(gl, quad, material, null);
  }, COMPOSITOR_FRAME_ORDER);

  return null;
}
