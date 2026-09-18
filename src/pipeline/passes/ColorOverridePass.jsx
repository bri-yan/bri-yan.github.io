import { useFrame } from '@react-three/fiber';
import { COLOR_OVERRIDE_PASS_FRAME_ORDER } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import colorOverrideFragment from '../../shaders/colorOverrideFragment.frag?raw';

/** Converts diffuse response into a shadow-to-base pigment color image. */
export function ColorOverridePass({ diffuseRef, outputRef, baseColor, shadowColor, enabled }) {
  const { target, uniforms, render } = useFullscreenPass(
    colorOverrideFragment,
    () => ({
      tDiffuse: { value: null },
      uBaseColor: { value: baseColor },
      uShadowColor: { value: shadowColor },
      uEnabled: { value: enabled ? 1 : 0 },
    })
  );

  if (outputRef) outputRef.current = target;

  useFrame(() => {
    const diffuse = diffuseRef.current;
    if (!diffuse) return;
    uniforms.tDiffuse.value = diffuse.texture;
    uniforms.uBaseColor.value = baseColor;
    uniforms.uShadowColor.value = shadowColor;
    uniforms.uEnabled.value = enabled ? 1 : 0;
    render();
  }, COLOR_OVERRIDE_PASS_FRAME_ORDER);

  return null;
}
