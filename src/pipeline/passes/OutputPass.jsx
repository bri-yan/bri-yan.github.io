import { useFrame } from '@react-three/fiber';
import { OUTPUT_FRAME_ORDER } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import outputFragment from '../../shaders/outputFragment.frag?raw';

/** Draws the finished, opaque painting to the screen. */
export function OutputPass({ sourceRef }) {
  const { uniforms, render } = useFullscreenPass(
    outputFragment,
    () => ({
      tSource: { value: null },
    }),
    { offscreen: false }
  );

  useFrame(() => {
    if (!sourceRef?.current) return;
    uniforms.tSource.value = sourceRef.current.texture;
    render();
  }, OUTPUT_FRAME_ORDER);

  return null;
}
