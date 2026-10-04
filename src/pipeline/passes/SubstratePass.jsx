import { useMemo } from 'react';
import * as THREE from 'three';
import { SUBSTRATE_PASS_FRAME_ORDER } from '../../config';
import { usePaintFrame } from '../PaintingFrame';
import { useFullscreenPass } from '../utils/passHooks';
import { zoomedPaperScale } from '../utils/paperZoom';
import { pixelsPerStageUnit } from '../utils/viewScale';
import substrateFragment from '../../shaders/substrateFragment.frag?raw';

/**
 * Generates procedural paper with normalized height in alpha. It stays put
 * through orbiting and panning but grows and shrinks about the screen center
 * with camera zoom, so zooming in also zooms into the paper. The noise is the
 * pipeline's heaviest per-pixel work, so it renders only when its own inputs
 * change (target size, stage scale, color, zoomed scale), never on an orbit.
 */
export function SubstratePass({ outputRef, color, scale }) {
  const { target, uniforms, render } = useFullscreenPass(substrateFragment, () => ({
    uResolution: { value: new THREE.Vector2() },
    uPixelRatio: { value: 1 },
    uSubstrateColor: { value: new THREE.Color() },
    uSubstrateScale: { value: scale },
  }));
  // Its inputs as last painted; a hot reload resets it with the material.
  const painted = useMemo(() => ({ key: null }), []);

  if (outputRef) outputRef.current = target;

  usePaintFrame((state) => {
    const pixelRatio = pixelsPerStageUnit(state);
    const paperScale = zoomedPaperScale(state, scale);
    // Orbiting keeps the camera's distance only to within float round-off;
    // seven digits ignore that while any visible zoom still repaints.
    const key = `${target.width}|${target.height}|${pixelRatio}|${color.getHex()}|${paperScale.toPrecision(7)}`;
    if (key === painted.key) return;
    painted.key = key;

    uniforms.uResolution.value.set(target.width, target.height);
    uniforms.uPixelRatio.value = pixelRatio;
    uniforms.uSubstrateColor.value.copy(color);
    uniforms.uSubstrateScale.value = paperScale;
    render();
  }, SUBSTRATE_PASS_FRAME_ORDER);

  return null;
}
