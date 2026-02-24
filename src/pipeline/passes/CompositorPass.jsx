import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  DEFAULT_FLOW_PATTERN_WEIGHT,
  DEFAULT_DIFFUSE_WEIGHT,
  DEFAULT_SPECULAR_WEIGHT,
  DEFAULT_BLUR_WEIGHT,
  DEFAULT_PAPER_WEIGHT,
  DEFAULT_COMPOSITOR_BACKGROUND,
  BLEND_MODE,
  COMPOSITOR_FRAME_ORDER,
} from '../../config';
import { createFullscreenQuad, renderFullscreenQuad } from '../utils/fullscreenQuad';
import fullscreenVertex from '../../shaders/fullscreenVertex.vert?raw';
import compositorFragmentShader from '../../shaders/compositorFragment.frag?raw';

/** Composites FlowPattern, lighting (diffuse+specular), Blur, and Paper FBOs into the final image. */
export function CompositorPass({
  flowPatternRef,
  diffuseRef,
  specularRef,
  blurRef,
  paperRef,
  flowPatternWeight = DEFAULT_FLOW_PATTERN_WEIGHT,
  diffuseWeight = DEFAULT_DIFFUSE_WEIGHT,
  specularWeight = DEFAULT_SPECULAR_WEIGHT,
  blurWeight = DEFAULT_BLUR_WEIGHT,
  paperWeight = DEFAULT_PAPER_WEIGHT,
  backgroundColor = new THREE.Color(DEFAULT_COMPOSITOR_BACKGROUND),
  showPaper = false,
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
          tDiffuse: { value: null },
          tSpecular: { value: null },
          tBlur: { value: null },
          tPaper: { value: null },
          uFlowPatternWeight: { value: flowPatternWeight },
          uDiffuseWeight: { value: diffuseWeight },
          uSpecularWeight: { value: specularWeight },
          uBlurWeight: { value: blurWeight },
          uPaperWeight: { value: paperWeight },
          uShowPaper: { value: 0 },
          uBackgroundColor: { value: backgroundColor },
          uBlendMode: { value: blendMode },
        },
      }),
    []
  );

  const quad = useMemo(() => createFullscreenQuad(material), [material]);
  const uniforms = material.uniforms;

  useFrame(() => {
    uniforms.uFlowPatternWeight.value = flowPatternWeight;
    uniforms.uDiffuseWeight.value = diffuseWeight;
    uniforms.uSpecularWeight.value = specularWeight;
    uniforms.uBlurWeight.value = blurWeight;
    uniforms.uPaperWeight.value = paperWeight;
    uniforms.uShowPaper.value = showPaper ? 1 : 0;
    uniforms.uBackgroundColor.value = backgroundColor;
    uniforms.uBlendMode.value = blendMode;
  }, -1);

  useFrame(() => {
    if (
      !flowPatternRef?.current ||
      !diffuseRef?.current ||
      !specularRef?.current ||
      !blurRef?.current
    )
      return;
    uniforms.tFlowPattern.value = flowPatternRef.current.texture;
    uniforms.tDiffuse.value = diffuseRef.current.texture;
    uniforms.tSpecular.value = specularRef.current.texture;
    uniforms.tBlur.value = blurRef.current.texture;
    uniforms.tPaper.value = paperRef?.current?.texture ?? null;
    renderFullscreenQuad(gl, quad, material, null);
  }, COMPOSITOR_FRAME_ORDER);

  return null;
}
