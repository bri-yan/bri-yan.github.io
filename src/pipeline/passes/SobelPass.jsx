import * as THREE from 'three';
import { SOBEL_PASS_FRAME_ORDER } from '../../config';
import { usePaintFrame } from '../PaintingFrame';
import { useFullscreenPass } from '../utils/passHooks';
import sobelFragment from '../../shaders/sobelFragment.frag?raw';

/**
 * Continuous depth edges in one pass: both Sobel gradients of the subject
 * depth, written premultiplied by subject coverage for the blur.
 */
export function SobelPass({ surfaceRef, outputRef, strength, radius }) {
  const { target, uniforms, render } = useFullscreenPass(sobelFragment, () => ({
    tSurface: { value: null },
    uTexelSize: { value: new THREE.Vector2() },
    uRadius: { value: 1 },
    uStrength: { value: 1 },
  }));

  if (outputRef) outputRef.current = target;

  usePaintFrame(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    uniforms.tSurface.value = surface.textures[1];
    uniforms.uTexelSize.value.set(1 / surface.width, 1 / surface.height);
    uniforms.uRadius.value = radius;
    uniforms.uStrength.value = strength;
    render();
  }, SOBEL_PASS_FRAME_ORDER);

  return null;
}
