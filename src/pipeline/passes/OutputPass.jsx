import { useFrame } from '@react-three/fiber';
import { OUTPUT_FRAME_ORDER } from '../../config';
import { useFullscreenPass, useUniformSync } from '../utils/passHooks';
import outputFragment from '../../shaders/outputFragment.frag?raw';

/** Draws the raw color image over a solid background. */
export function OutputPass({ colorRef, backgroundColor }) {
  const { uniforms, render } = useFullscreenPass(
    outputFragment,
    () => ({
      tColor: { value: null },
      uBackgroundColor: { value: backgroundColor },
    }),
    { offscreen: false }
  );

  useUniformSync(uniforms, () => ({ uBackgroundColor: backgroundColor }));

  useFrame(() => {
    if (!colorRef?.current) return;
    uniforms.tColor.value = colorRef.current.texture;
    render();
  }, OUTPUT_FRAME_ORDER);

  return null;
}
