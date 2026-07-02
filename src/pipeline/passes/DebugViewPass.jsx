import { useFrame } from '@react-three/fiber';
import { DEBUG_VIEW_FRAME_ORDER, DEBUG_CHANNELS } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import debugViewFragment from '../../shaders/debugViewFragment.frag?raw';

/**
 * Dev tool: draws a single pass's FBO to the screen, replacing the compositor
 * output. `passes` maps view names to FBO refs; when `view` has no entry
 * (e.g. 'final') the pass does nothing and the compositor output stands.
 */
export function DebugViewPass({ passes, view = 'final', channel = 'rgb' }) {
  const { uniforms, render } = useFullscreenPass(
    debugViewFragment,
    () => ({
      tInput: { value: null },
      uChannel: { value: 0 },
    }),
    { offscreen: false }
  );

  useFrame(() => {
    const source = passes[view];
    if (!source?.current) return;
    uniforms.tInput.value = source.current.texture;
    uniforms.uChannel.value = Math.max(0, DEBUG_CHANNELS.indexOf(channel));
    render();
  }, DEBUG_VIEW_FRAME_ORDER);

  return null;
}
