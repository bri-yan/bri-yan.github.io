import { useFrame } from '@react-three/fiber';
import { DIFFUSE_COMPOSITION_PASS_FRAME_ORDER } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import oklabChunk from '../../shaders/chunks/oklab.glsl?raw';
import diffuseCompositionFragment from '../../shaders/diffuseCompositionFragment.frag?raw';

const fragmentShader = `${oklabChunk}\n${diffuseCompositionFragment}`;

/**
 * Joins color-override pigment (RGB) with dilution density (A) into one
 * watercolor layer, mottled by pigment turbulence.
 */
export function DiffuseCompositionPass({
  colorOverrideRef,
  dilutionRef,
  turbulenceRef,
  outputRef,
  turbulenceIntensity,
}) {
  const { target, uniforms, render } = useFullscreenPass(fragmentShader, () => ({
    tColorOverride: { value: null },
    tDilution: { value: null },
    tTurbulence: { value: null },
    uIntensity: { value: 0 },
  }));

  if (outputRef) outputRef.current = target;

  useFrame(() => {
    const colorOverride = colorOverrideRef.current;
    const dilution = dilutionRef.current;
    const turbulence = turbulenceRef.current;
    if (!colorOverride || !dilution || !turbulence) return;
    uniforms.tColorOverride.value = colorOverride.texture;
    uniforms.tDilution.value = dilution.texture;
    uniforms.tTurbulence.value = turbulence.texture;
    uniforms.uIntensity.value = turbulenceIntensity;
    render();
  }, DIFFUSE_COMPOSITION_PASS_FRAME_ORDER);

  return null;
}
