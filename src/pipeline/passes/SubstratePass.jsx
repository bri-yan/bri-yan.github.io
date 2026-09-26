import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SIGNED_FBO_OPTIONS, SUBSTRATE_PASS_FRAME_ORDER } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import substrateFragment from '../../shaders/substrateFragment.frag?raw';

/** Generates a stationary procedural paper image with normalized height in alpha. */
export function SubstratePass({ outputRef, color, scale }) {
  const { target, uniforms, render } = useFullscreenPass(
    substrateFragment,
    () => ({
      uResolution: { value: new THREE.Vector2() },
      uPixelRatio: { value: 1 },
      uSubstrateColor: { value: color },
      uSubstrateScale: { value: scale },
    }),
    { fboOptions: SIGNED_FBO_OPTIONS }
  );

  if (outputRef) outputRef.current = target;

  useFrame(({ gl }) => {
    uniforms.uResolution.value.set(target.width, target.height);
    uniforms.uPixelRatio.value = gl.getPixelRatio();
    uniforms.uSubstrateColor.value = color;
    uniforms.uSubstrateScale.value = scale;
    render();
  }, SUBSTRATE_PASS_FRAME_ORDER);

  return null;
}
