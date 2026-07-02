import { useFrame } from '@react-three/fiber';
import { COMPOSITOR_FRAME_ORDER } from '../../config';
import { useFullscreenPass, useUniformSync } from '../utils/passHooks';
import compositorFragment from '../../shaders/compositorFragment.frag?raw';

/** Composites the FlowPattern, blurred-Diffuse, Specular, and Blur FBOs over the background color — the only pass that draws to the screen. */
export function CompositorPass({
  flowPatternRef,
  diffuseRef,
  specularRef,
  blurRef,
  flowPatternWeight,
  diffuseWeight,
  specularWeight,
  blurWeight,
  diffuseGain,
  backgroundColor,
}) {
  const { uniforms, render } = useFullscreenPass(
    compositorFragment,
    () => ({
      tFlowPattern: { value: null },
      tDiffuse: { value: null },
      tSpecular: { value: null },
      tBlur: { value: null },
      uFlowPatternWeight: { value: flowPatternWeight },
      uDiffuseWeight: { value: diffuseWeight },
      uSpecularWeight: { value: specularWeight },
      uBlurWeight: { value: blurWeight },
      uDiffuseGain: { value: diffuseGain },
      uBackgroundColor: { value: backgroundColor },
    }),
    { offscreen: false }
  );

  useUniformSync(uniforms, () => ({
    uFlowPatternWeight: flowPatternWeight,
    uDiffuseWeight: diffuseWeight,
    uSpecularWeight: specularWeight,
    uBlurWeight: blurWeight,
    uDiffuseGain: diffuseGain,
    uBackgroundColor: backgroundColor,
  }));

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
    render();
  }, COMPOSITOR_FRAME_ORDER);

  return null;
}
