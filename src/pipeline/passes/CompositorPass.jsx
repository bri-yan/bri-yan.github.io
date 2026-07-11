import { useFrame } from '@react-three/fiber';
import { COMPOSITOR_FRAME_ORDER } from '../../config';
import { useFullscreenPass, useUniformSync } from '../utils/passHooks';
import compositorFragment from '../../shaders/compositorFragment.frag?raw';

/** Composites the paint layers (edge + body), blurred-diffuse shading, specular, and blur FBOs over the background color — the only pass that draws to the screen. */
export function CompositorPass({
  edgeRef,
  bodyRef,
  diffuseRef,
  specularRef,
  blurRef,
  edgeWeight,
  bodyWeight,
  diffuseWeight,
  specularWeight,
  blurWeight,
  diffuseGain,
  backgroundColor,
}) {
  const { uniforms, render } = useFullscreenPass(
    compositorFragment,
    () => ({
      tEdge: { value: null },
      tBody: { value: null },
      tDiffuse: { value: null },
      tSpecular: { value: null },
      tBlur: { value: null },
      uEdgeWeight: { value: edgeWeight },
      uBodyWeight: { value: bodyWeight },
      uDiffuseWeight: { value: diffuseWeight },
      uSpecularWeight: { value: specularWeight },
      uBlurWeight: { value: blurWeight },
      uDiffuseGain: { value: diffuseGain },
      uBackgroundColor: { value: backgroundColor },
    }),
    { offscreen: false }
  );

  useUniformSync(uniforms, () => ({
    uEdgeWeight: edgeWeight,
    uBodyWeight: bodyWeight,
    uDiffuseWeight: diffuseWeight,
    uSpecularWeight: specularWeight,
    uBlurWeight: blurWeight,
    uDiffuseGain: diffuseGain,
    uBackgroundColor: backgroundColor,
  }));

  useFrame(() => {
    if (
      !edgeRef?.current ||
      !bodyRef?.current ||
      !diffuseRef?.current ||
      !specularRef?.current ||
      !blurRef?.current
    )
      return;
    uniforms.tEdge.value = edgeRef.current.texture;
    uniforms.tBody.value = bodyRef.current.texture;
    uniforms.tDiffuse.value = diffuseRef.current.texture;
    uniforms.tSpecular.value = specularRef.current.texture;
    uniforms.tBlur.value = blurRef.current.texture;
    render();
  }, COMPOSITOR_FRAME_ORDER);

  return null;
}
