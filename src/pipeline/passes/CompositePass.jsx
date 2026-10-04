import * as THREE from 'three';
import { COMPOSITE_PASS_FRAME_ORDER, MIN_PAPER_SCALE, PAINTING_TARGET_OPTIONS } from '../../config';
import { usePaintFrame } from '../PaintingFrame';
import { useFullscreenPass } from '../utils/passHooks';
import { zoomedPaperScale } from '../utils/paperZoom';
import { pixelsPerStageUnit } from '../utils/viewScale';
import oklabChunk from '../../shaders/chunks/oklab.glsl?raw';
import paperSlopeChunk from '../../shaders/chunks/paperSlope.glsl?raw';
import compositeFragment from '../../shaders/compositeFragment.frag?raw';

const fragmentShader = `${oklabChunk}\n${paperSlopeChunk}\n${compositeFragment}`;

const DEG_TO_RAD = Math.PI / 180;

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
  dryBrushSoftness,
  dryBrushLightThreshold,
  dryBrushLightSoftness,
  lightingEnabled,
  lightAngle,
  lightStrength,
  roughness,
}) {
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
      uDryBrushAmount: { value: 0 },
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
    uniforms.uPixelsPerPaperUnit.value = pixelRatio * paperScale;
    uniforms.uCssPixelToUv.value.set(pixelRatio / paint.width, pixelRatio / paint.height);
    uniforms.uPaperColor.value.copy(paperColor);
    uniforms.uDistortionEnabled.value = distortionEnabled;
    uniforms.uDistortion.value = distortion * magnification;
    uniforms.uGranulation.value = granulationIntensity;
    uniforms.uDryBrushAmount.value = dryBrushAmount;
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
