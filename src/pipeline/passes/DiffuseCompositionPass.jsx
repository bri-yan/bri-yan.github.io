import { useFrame } from '@react-three/fiber';
import { DIFFUSE_COMPOSITION_PASS_FRAME_ORDER } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import diffuseCompositionFragment from '../../shaders/diffuseCompositionFragment.frag?raw';

/** Joins color-override pigment (RGB) with dilution density (A) into one watercolor layer. */
export function DiffuseCompositionPass({ colorOverrideRef, dilutionRef, outputRef }) {
  const { target, uniforms, render } = useFullscreenPass(
    diffuseCompositionFragment,
    () => ({
      tColorOverride: { value: null },
      tDilution: { value: null },
    })
  );

  if (outputRef) outputRef.current = target;

  useFrame(() => {
    const colorOverride = colorOverrideRef.current;
    const dilution = dilutionRef.current;
    if (!colorOverride || !dilution) return;
    uniforms.tColorOverride.value = colorOverride.texture;
    uniforms.tDilution.value = dilution.texture;
    render();
  }, DIFFUSE_COMPOSITION_PASS_FRAME_ORDER);

  return null;
}
