import { useFrame } from '@react-three/fiber';
import { DEBUG_VIEW_FRAME_ORDER, DEBUG_CHANNELS } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import debugViewFragment from '../../shaders/debugViewFragment.frag?raw';

/**
 * Dev tool: draws a single pass's FBO to the screen, replacing the compositor
 * output. `passes` maps view names to FBO refs; when `view` has no entry
 * (e.g. 'output') the pass does nothing and the normal output stands.
 */
export function DebugViewPass({ passes, view = 'output', channel = 'rgb' }) {
  const { uniforms, render } = useFullscreenPass(
    debugViewFragment,
    () => ({
      tInput: { value: null },
      uChannel: { value: 0 },
      uMode: { value: 0 },
      uNear: { value: 0.1 },
      uFar: { value: 1000 },
    }),
    { offscreen: false }
  );

  useFrame(({ camera }) => {
    const source = passes[view];
    if (!source?.current) return;
    uniforms.tInput.value = source.current.texture;
    uniforms.uChannel.value = Math.max(0, DEBUG_CHANNELS.indexOf(channel));
    uniforms.uMode.value = view === 'raw-depth' ? 1 : view === 'normalized-depth' ? 2 : 0;
    uniforms.uNear.value = camera.near;
    uniforms.uFar.value = camera.far;
    render();
  }, DEBUG_VIEW_FRAME_ORDER);

  return null;
}
