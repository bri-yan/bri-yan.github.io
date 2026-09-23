import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SOBEL_PASS_FRAME_ORDER } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import sobelDirectionalFragment from '../../shaders/sobelDirectionalFragment.frag?raw';
import sobelCombineFragment from '../../shaders/sobelCombineFragment.frag?raw';

/** Produces continuous normalized-depth edges from private horizontal and vertical gradients. */
export function SobelPass({ normalizedDepthRef, outputRef, strength, radius }) {
  const horizontal = useFullscreenPass(sobelDirectionalFragment, () => ({
    tNormalizedDepth: { value: null },
    uTexelSize: { value: new THREE.Vector2() },
    uDirection: { value: 0 },
    uRadius: { value: 1 },
  }));
  const vertical = useFullscreenPass(sobelDirectionalFragment, () => ({
    tNormalizedDepth: { value: null },
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

  useFrame(() => {
    const normalizedDepth = normalizedDepthRef.current;
    if (!normalizedDepth) return;

    const texelSize = horizontal.uniforms.uTexelSize.value;
    texelSize.set(1 / normalizedDepth.width, 1 / normalizedDepth.height);
    horizontal.uniforms.tNormalizedDepth.value = normalizedDepth.texture;
    horizontal.uniforms.uRadius.value = radius;
    horizontal.render();

    vertical.uniforms.tNormalizedDepth.value = normalizedDepth.texture;
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
