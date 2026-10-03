import { useFrame } from '@react-three/fiber';
import { DRY_BRUSH_PASS_FRAME_ORDER } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import dryBrushFragment from '../../shaders/dryBrushFragment.frag?raw';

/** Paper peaks the brush skips, evenly wherever the light is above a threshold. */
export function DryBrushPass({
  diffuseRef,
  substrateRef,
  outputRef,
  amount,
  softness,
  lightThreshold,
  lightSoftness,
}) {
  const { target, uniforms, render } = useFullscreenPass(dryBrushFragment, () => ({
    tDiffuse: { value: null },
    tSubstrate: { value: null },
    uAmount: { value: amount },
    uSoftness: { value: softness },
    uLightThreshold: { value: lightThreshold },
    uLightSoftness: { value: lightSoftness },
  }));

  if (outputRef) outputRef.current = target;

  useFrame(() => {
    const diffuse = diffuseRef.current;
    const substrate = substrateRef.current;
    if (!diffuse || !substrate) return;
    uniforms.tDiffuse.value = diffuse.texture;
    uniforms.tSubstrate.value = substrate.texture;
    uniforms.uAmount.value = amount;
    uniforms.uSoftness.value = softness;
    uniforms.uLightThreshold.value = lightThreshold;
    uniforms.uLightSoftness.value = lightSoftness;
    render();
  }, DRY_BRUSH_PASS_FRAME_ORDER);

  return null;
}
