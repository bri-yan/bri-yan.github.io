import * as THREE from 'three';
import {
  COMPOSITE_PASS_FRAME_ORDER,
  DRY_BRUSH_FLECK_MAX,
  DRY_BRUSH_FLECK_MIN,
  MIN_PAPER_SCALE,
  PAINTING_TARGET_OPTIONS,
} from '../../config';
import { usePaintFrame } from '../PaintingFrame';
import { useTransition } from '../Transition';
import { useFullscreenPass } from '../utils/passHooks';
import { zoomedPaperScale } from '../utils/paperZoom';
import { pixelsPerStageUnit } from '../utils/viewScale';
import oklabChunk from '../../shaders/chunks/oklab.glsl?raw';
import paperSlopeChunk from '../../shaders/chunks/paperSlope.glsl?raw';
import compositeFragment from '../../shaders/compositeFragment.frag?raw';

const fragmentShader = `${oklabChunk}\n${paperSlopeChunk}\n${compositeFragment}`;

const DEG_TO_RAD = Math.PI / 180;

// Dry brush density compares each point with a ring of paper around it. The
// spread (standard deviation) of that difference, by ring radius in paper
// units, was measured on the paper noise and does not depend on zoom or window
// size; dividing by it, and scaling to the paper height's own spread, keeps the
// dry area for a given amount the same at every fleck size.
const PAPER_SPREAD = 0.11;
const RING_SPREAD = [
  [0.25, 0.029],
  [0.3, 0.035],
  [0.4, 0.045],
  [0.5, 0.055],
  [0.6, 0.063],
  [0.8, 0.079],
  [1, 0.092],
  [1.2, 0.103],
  [1.5, 0.113],
  [2, 0.12],
];
const MIN_FLECK_PIXELS = 1.5; // a tighter ring just reads the pixel itself
const PEAKS_ONLY_DENSITY = 0.2; // the density that has fully left the paper's own height

function ringSpread(radius) {
  if (radius <= RING_SPREAD[0][0]) return RING_SPREAD[0][1];
  for (let i = 1; i < RING_SPREAD.length; i++) {
    const [farRadius, farSpread] = RING_SPREAD[i];
    if (radius > farRadius) continue;
    const [nearRadius, nearSpread] = RING_SPREAD[i - 1];
    return nearSpread + ((radius - nearRadius) / (farRadius - nearRadius)) * (farSpread - nearSpread);
  }
  return RING_SPREAD[RING_SPREAD.length - 1][1];
}

/**
 * The finished painting, into an 8-bit target the output copies to screen:
 * edge-darkened paint on paper with toggleable substrate effects. Distortion
 * shifts the paint along the paper slope; granulation and dry brush are then
 * applied at the undistorted pixel so they stay on the paper tooth; specular
 * highlights are lifted to bare paper; lighting shades everything by paper
 * normals rebuilt from that slope. It repaints only with the painting, so a
 * frame that only moves the cursor never recomputes it.
 */
export function CompositePass({
  paintRef,
  surfaceRef,
  substrateRef,
  outputRef,
  paperColor,
  substrateScale,
  distortionEnabled,
  distortion,
  granulationIntensity,
  dryBrushAmount,
  dryBrushDensity,
  dryBrushSoftness,
  dryBrushLightThreshold,
  dryBrushLightSoftness,
  lightingEnabled,
  lightAngle,
  lightStrength,
  roughness,
}) {
  const transition = useTransition();
  const { target, uniforms, render } = useFullscreenPass(
    fragmentShader,
    () => ({
      tPaint: { value: null },
      tSurface: { value: null },
      tSubstrate: { value: null },
      uSubstrateTexelSize: { value: new THREE.Vector2() },
      uPixelsPerPaperUnit: { value: 1 },
      uCssPixelToUv: { value: new THREE.Vector2() },
      uPaperColor: { value: new THREE.Color() },
      uDistortionEnabled: { value: true },
      uDistortion: { value: 0 },
      uGranulation: { value: 0 },
      uTransition: { value: 0 },
      uDryBrushAmount: { value: 0 },
      uDryBrushFleck: { value: 0 },
      uDryBrushPeakGain: { value: 1 },
      uDryBrushPeakBlend: { value: 0 },
      uDryBrushSoftness: { value: 0.05 },
      uDryBrushLightThreshold: { value: 0.5 },
      uDryBrushLightSoftness: { value: 0.25 },
      uLightingEnabled: { value: true },
      uLightDirection: { value: new THREE.Vector3() },
      uLightStrength: { value: 0 },
      uRoughness: { value: 1 },
    }),
    { fboOptions: PAINTING_TARGET_OPTIONS }
  );

  if (outputRef) outputRef.current = target;

  usePaintFrame((state) => {
    const paint = paintRef.current;
    const surface = surfaceRef.current;
    const substrate = substrateRef.current;
    if (!paint || !surface || !substrate) return;

    const pixelRatio = pixelsPerStageUnit(state); // device pixels per stage pixel
    const paperScale = zoomedPaperScale(state, substrateScale);
    // Distortion is a shift on the paper, so it magnifies along with it.
    const magnification = paperScale / Math.max(substrateScale, MIN_PAPER_SCALE);
    const angle = lightAngle * DEG_TO_RAD;
    uniforms.tPaint.value = paint.texture;
    uniforms.tSurface.value = surface.textures[1];
    uniforms.tSubstrate.value = substrate.texture;
    uniforms.uSubstrateTexelSize.value.set(1 / substrate.width, 1 / substrate.height);
    const pixelsPerPaperUnit = pixelRatio * paperScale;
    uniforms.uPixelsPerPaperUnit.value = pixelsPerPaperUnit;
    uniforms.uCssPixelToUv.value.set(pixelRatio / paint.width, pixelRatio / paint.height);
    uniforms.uPaperColor.value.copy(paperColor);
    uniforms.uDistortionEnabled.value = distortionEnabled;
    uniforms.uDistortion.value = distortion * magnification;
    uniforms.uGranulation.value = granulationIntensity;
    uniforms.uTransition.value = transition.progress;
    uniforms.uDryBrushAmount.value = dryBrushAmount;
    if (dryBrushDensity > 0) {
      // From the largest ring at the lowest density to the smallest at 1, evenly in log size.
      const size = DRY_BRUSH_FLECK_MAX * (DRY_BRUSH_FLECK_MIN / DRY_BRUSH_FLECK_MAX) ** dryBrushDensity;
      const fleck = Math.max(size, MIN_FLECK_PIXELS / pixelsPerPaperUnit);
      uniforms.uDryBrushFleck.value = fleck * pixelsPerPaperUnit;
      uniforms.uDryBrushPeakGain.value = PAPER_SPREAD / ringSpread(fleck);
      uniforms.uDryBrushPeakBlend.value = Math.min(1, dryBrushDensity / PEAKS_ONLY_DENSITY);
    } else {
      uniforms.uDryBrushFleck.value = 0;
    }
    uniforms.uDryBrushSoftness.value = dryBrushSoftness;
    uniforms.uDryBrushLightThreshold.value = dryBrushLightThreshold;
    uniforms.uDryBrushLightSoftness.value = dryBrushLightSoftness;
    uniforms.uLightingEnabled.value = lightingEnabled;
    // Angle 0° = light from the right, counter-clockwise on screen; y is screen-down.
    uniforms.uLightDirection.value.set(Math.cos(angle), -Math.sin(angle), 1).normalize();
    uniforms.uLightStrength.value = lightStrength;
    uniforms.uRoughness.value = roughness;
    render();
  }, COMPOSITE_PASS_FRAME_ORDER);

  return null;
}
