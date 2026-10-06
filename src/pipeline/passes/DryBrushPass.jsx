import * as THREE from 'three';
import { DRY_BRUSH_PASS_FRAME_ORDER } from '../../config';
import { usePaintFrame } from '../PaintingFrame';
import { useFullscreenPass } from '../utils/passHooks';
import { zoomedPaperScale } from '../utils/paperZoom';
import { pixelsPerStageUnit } from '../utils/viewScale';
import dryBrushFragment from '../../shaders/dryBrushFragment.frag?raw';

// Density sets the ring of paper a point is compared with, in paper units:
// the larger the ring, the larger and sparser the flecks.
const COARSEST_RING = 2;
const FINEST_RING = 0.3;

/**
 * Paper peaks the brush skips, evenly wherever the light is above a threshold.
 * Density 0 judges the paper's own height. Above 0, a peak is a point that rises
 * above the paper around it, so the flecks are smaller, more numerous, and even.
 */
export function DryBrushPass({
  diffuseRef,
  substrateRef,
  outputRef,
  amount,
  density,
  softness,
  lightThreshold,
  lightSoftness,
  substrateScale,
}) {
  const { target, uniforms, render } = useFullscreenPass(dryBrushFragment, () => ({
    tDiffuse: { value: null },
    tSubstrate: { value: null },
    uAmount: { value: amount },
    uSoftness: { value: softness },
    uLightThreshold: { value: lightThreshold },
    uLightSoftness: { value: lightSoftness },
    uTexelSize: { value: new THREE.Vector2() },
    uFleckRadius: { value: 0 },
    uPeakGain: { value: 1 },
  }));

  if (outputRef) outputRef.current = target;

  usePaintFrame((state) => {
    const diffuse = diffuseRef.current;
    const substrate = substrateRef.current;
    if (!diffuse || !substrate) return;
    uniforms.tDiffuse.value = diffuse.texture;
    uniforms.tSubstrate.value = substrate.texture;
    uniforms.uAmount.value = amount;
    uniforms.uSoftness.value = softness;
    uniforms.uLightThreshold.value = lightThreshold;
    uniforms.uLightSoftness.value = lightSoftness;

    // The ring runs from coarse to fine evenly in log size, and follows the
    // paper through zoom.
    const ring = COARSEST_RING * (FINEST_RING / COARSEST_RING) ** density;
    const pixelsPerPaperUnit = pixelsPerStageUnit(state) * zoomedPaperScale(state, substrateScale);
    uniforms.uTexelSize.value.set(1 / substrate.width, 1 / substrate.height);
    uniforms.uFleckRadius.value = density > 0 ? ring * pixelsPerPaperUnit : 0;
    // Peaks vary less than the paper's own height (spread 0.11), the less so the
    // smaller the ring: about 0.128 · tanh(ring / 1.1), measured on the paper
    // noise. Dividing by it keeps the dry area for a given amount the same at
    // every density.
    uniforms.uPeakGain.value = 0.11 / (0.128 * Math.tanh(ring / 1.1));
    render();
  }, DRY_BRUSH_PASS_FRAME_ORDER);

  return null;
}
