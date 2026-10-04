import * as THREE from 'three';
import { SOBEL_PASS_FRAME_ORDER } from '../../config';
import { usePaintFrame } from '../PaintingFrame';
import { useFullscreenPass } from '../utils/passHooks';
import sobelDirectionalFragment from '../../shaders/sobelDirectionalFragment.frag?raw';
import sobelCombineFragment from '../../shaders/sobelCombineFragment.frag?raw';

/** Produces continuous depth edges from private horizontal and vertical gradients. */
export function SobelPass({ depthRef, outputRef, strength, radius }) {
  const horizontal = useFullscreenPass(sobelDirectionalFragment, () => ({
    tDepth: { value: null },
    uTexelSize: { value: new THREE.Vector2() },
    uDirection: { value: 0 },
    uRadius: { value: 1 },
  }));
  const vertical = useFullscreenPass(sobelDirectionalFragment, () => ({
    tDepth: { value: null },
    uTexelSize: { value: new THREE.Vector2() },
    uDirection: { value: 1 },
    uRadius: { value: 1 },
  }));
  const combined = useFullscreenPass(sobelCombineFragment, () => ({
    tHorizontal: { value: null },
    tVertical: { value: null },
    uStrength: { value: 1 },
  }));

  if (outputRef) outputRef.current = combined.target;

  usePaintFrame(() => {
    const depth = depthRef.current;
    if (!depth) return;

    const texelSize = horizontal.uniforms.uTexelSize.value;
    texelSize.set(1 / depth.width, 1 / depth.height);
    horizontal.uniforms.tDepth.value = depth.texture;
    horizontal.uniforms.uRadius.value = radius;
    horizontal.render();

    vertical.uniforms.tDepth.value = depth.texture;
    vertical.uniforms.uTexelSize.value.copy(texelSize);
    vertical.uniforms.uRadius.value = radius;
    vertical.render();

    combined.uniforms.tHorizontal.value = horizontal.target.texture;
    combined.uniforms.tVertical.value = vertical.target.texture;
    combined.uniforms.uStrength.value = strength;
    combined.render();
  }, SOBEL_PASS_FRAME_ORDER);

  return null;
}
