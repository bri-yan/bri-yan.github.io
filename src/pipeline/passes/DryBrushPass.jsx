import { useFrame } from '@react-three/fiber';
import { DRY_BRUSH_PASS_FRAME_ORDER } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import dryBrushFragment from '../../shaders/dryBrushFragment.frag?raw';

/** Paper peaks the brush skips, reaching further where the light is brightest. */
export function DryBrushPass({ diffuseRef, substrateRef, outputRef, amount, softness }) {
  const { target, uniforms, render } = useFullscreenPass(dryBrushFragment, () => ({
    tDiffuse: { value: null },
    tSubstrate: { value: null },
    uAmount: { value: amount },
    uSoftness: { value: softness },
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
    render();
  }, DRY_BRUSH_PASS_FRAME_ORDER);

  return null;
}
