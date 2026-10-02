import { useFrame } from '@react-three/fiber';
import { GRANULATION_PASS_FRAME_ORDER, SIGNED_FBO_OPTIONS } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import granulationFragment from '../../shaders/granulationFragment.frag?raw';

/**
 * Signed pigment settling from the paper height, strongest in shadow:
 * + where pigment collects in valleys, − where it drains off peaks.
 */
export function GranulationPass({ diffuseRef, substrateRef, outputRef, intensity }) {
  const { target, uniforms, render } = useFullscreenPass(
    granulationFragment,
    () => ({
      tDiffuse: { value: null },
      tSubstrate: { value: null },
      uIntensity: { value: intensity },
    }),
    { fboOptions: SIGNED_FBO_OPTIONS }
  );

  if (outputRef) outputRef.current = target;

  useFrame(() => {
    const diffuse = diffuseRef.current;
    const substrate = substrateRef.current;
    if (!diffuse || !substrate) return;
    uniforms.tDiffuse.value = diffuse.texture;
    uniforms.tSubstrate.value = substrate.texture;
    uniforms.uIntensity.value = intensity;
    render();
  }, GRANULATION_PASS_FRAME_ORDER);

  return null;
}
