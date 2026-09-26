import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GRADIENT_PASS_FRAME_ORDER, SIGNED_FBO_OPTIONS } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import gradientFragment from '../../shaders/gradientFragment.frag?raw';

/** Signed substrate slope ∇h in paper units, from the height in substrate alpha. */
export function GradientPass({ substrateRef, outputRef, scale }) {
  const { target, uniforms, render } = useFullscreenPass(
    gradientFragment,
    () => ({
      tSubstrate: { value: null },
      uTexelSize: { value: new THREE.Vector2() },
      uPixelsPerPaperUnit: { value: 1 },
    }),
    { fboOptions: SIGNED_FBO_OPTIONS }
  );

  if (outputRef) outputRef.current = target;

  useFrame(({ gl }) => {
    const substrate = substrateRef.current;
    if (!substrate) return;
    uniforms.tSubstrate.value = substrate.texture;
    uniforms.uTexelSize.value.set(1 / substrate.width, 1 / substrate.height);
    uniforms.uPixelsPerPaperUnit.value = gl.getPixelRatio() * Math.max(scale, 0.5);
    render();
  }, GRADIENT_PASS_FRAME_ORDER);

  return null;
}
