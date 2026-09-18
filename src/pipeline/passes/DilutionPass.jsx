import { useFrame } from '@react-three/fiber';
import { DILUTION_PASS_FRAME_ORDER } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import dilutionFragment from '../../shaders/dilutionFragment.frag?raw';

/** Converts diffuse light into a light-thinned coverage signal. */
export function DilutionPass({ diffuseRef, outputRef, strength }) {
  const { target, uniforms, render } = useFullscreenPass(
    dilutionFragment,
    () => ({
      tDiffuse: { value: null },
      uStrength: { value: strength },
    })
  );

  if (outputRef) outputRef.current = target;

  useFrame(() => {
    const diffuse = diffuseRef.current;
    if (!diffuse) return;
    uniforms.tDiffuse.value = diffuse.texture;
    uniforms.uStrength.value = strength;
    render();
  }, DILUTION_PASS_FRAME_ORDER);

  return null;
}
