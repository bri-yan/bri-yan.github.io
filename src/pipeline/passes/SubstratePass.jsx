import * as THREE from 'three';
import { SIGNED_FBO_OPTIONS, SUBSTRATE_PASS_FRAME_ORDER } from '../../config';
import { usePaintFrame } from '../PaintingFrame';
import { useFullscreenPass } from '../utils/passHooks';
import { zoomedPaperScale } from '../utils/paperZoom';
import { pixelsPerStageUnit } from '../utils/viewScale';
import substrateFragment from '../../shaders/substrateFragment.frag?raw';

/**
 * Generates procedural paper with normalized height in alpha. It stays put
 * through orbiting and panning but grows and shrinks about the screen center
 * with camera zoom, so zooming in also zooms into the paper.
 */
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

  usePaintFrame((state) => {
    uniforms.uResolution.value.set(target.width, target.height);
    uniforms.uPixelRatio.value = pixelsPerStageUnit(state);
    uniforms.uSubstrateColor.value = color;
    uniforms.uSubstrateScale.value = zoomedPaperScale(state, scale);
    render();
  }, SUBSTRATE_PASS_FRAME_ORDER);

  return null;
}
