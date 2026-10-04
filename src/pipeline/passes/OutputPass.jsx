import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CURSOR_DISTORTION,
  CURSOR_LINE_WIDTH,
  CURSOR_PRESS_SMOOTHING,
  CURSOR_PRESSED_SCALE,
  CURSOR_RADIUS,
  MIN_PAPER_SCALE,
  OUTPUT_FRAME_ORDER,
} from '../../config';
import { usePaintingCursor } from '../utils/paintingCursor';
import { useFullscreenPass } from '../utils/passHooks';
import { zoomedPaperScale } from '../utils/paperZoom';
import { pixelsPerStageUnit } from '../utils/viewScale';
import oklabChunk from '../../shaders/chunks/oklab.glsl?raw';
import outputFragment from '../../shaders/outputFragment.frag?raw';

const fragmentShader = `${oklabChunk}\n${outputFragment}`;

const DEG_TO_RAD = Math.PI / 180;
const drawingBufferSize = new THREE.Vector2();

/**
 * Draws the finished painting to screen: edge-darkened paint on paper with
 * specular highlights lifted to bare paper, and toggleable substrate effects.
 * Distortion shifts the paint along the paper slope; granulation and dry brush
 * are then applied at the undistorted pixel so they stay on the paper tooth;
 * lighting shades everything by paper normals rebuilt from that slope.
 * `paperOnly` leaves the paint out, so the paper reads exactly as it does
 * under the painting (the substrate view). While `cursorEnabled`, it also
 * draws the cursor over the canvas in place of the system one.
 */
export function OutputPass({
  paintRef,
  specularRef,
  substrateRef,
  granulationRef,
  dryBrushRef,
  paperColor,
  paperOnly = false,
  substrateScale,
  distortionEnabled,
  distortion,
  lightingEnabled,
  lightAngle,
  lightStrength,
  roughness,
  cursorEnabled = false,
}) {
  const cursor = usePaintingCursor(cursorEnabled);
  const press = useRef(0);
  const { uniforms, render } = useFullscreenPass(
    fragmentShader,
    () => ({
      tPaint: { value: null },
      tSpecular: { value: null },
      tSubstrate: { value: null },
      tGranulation: { value: null },
      tDryBrush: { value: null },
      uCssPixelToUv: { value: new THREE.Vector2() },
      uSubstrateTexelSize: { value: new THREE.Vector2() },
      uPixelsPerPaperUnit: { value: 1 },
      uPaperColor: { value: paperColor },
      uPaperOnly: { value: false },
      uDistortionEnabled: { value: true },
      uDistortion: { value: 0 },
      uLightingEnabled: { value: true },
      uLightDirection: { value: new THREE.Vector3() },
      uLightStrength: { value: 0 },
      uRoughness: { value: 1 },
      uCursorVisible: { value: false },
      uCursorPosition: { value: new THREE.Vector2() },
      uCursorRadius: { value: 0 },
      uCursorLineWidth: { value: 0 },
      uCursorDistortion: { value: 0 },
    }),
    { offscreen: false }
  );

  useFrame((state, delta) => {
    const paint = paintRef.current;
    const specular = specularRef.current;
    const substrate = substrateRef.current;
    const granulation = granulationRef.current;
    const dryBrush = dryBrushRef.current;
    if (!paint || !specular || !substrate || !granulation || !dryBrush) return;

    const pixelRatio = pixelsPerStageUnit(state); // device pixels per stage pixel
    const paperScale = zoomedPaperScale(state, substrateScale);
    // Distortion is a shift on the paper, so it magnifies along with it.
    const magnification = paperScale / Math.max(substrateScale, MIN_PAPER_SCALE);
    const angle = lightAngle * DEG_TO_RAD;
    uniforms.tPaint.value = paint.texture;
    uniforms.tSpecular.value = specular.texture;
    uniforms.tSubstrate.value = substrate.texture;
    uniforms.tGranulation.value = granulation.texture;
    uniforms.tDryBrush.value = dryBrush.texture;
    uniforms.uCssPixelToUv.value.set(pixelRatio / paint.width, pixelRatio / paint.height);
    uniforms.uSubstrateTexelSize.value.set(1 / substrate.width, 1 / substrate.height);
    uniforms.uPixelsPerPaperUnit.value = pixelRatio * paperScale;
    uniforms.uPaperColor.value = paperColor;
    uniforms.uPaperOnly.value = paperOnly;
    uniforms.uDistortionEnabled.value = distortionEnabled;
    uniforms.uDistortion.value = distortion * magnification;
    uniforms.uLightingEnabled.value = lightingEnabled;
    // Angle 0° = light from the right, counter-clockwise on screen; y is screen-down.
    uniforms.uLightDirection.value.set(Math.cos(angle), -Math.sin(angle), 1).normalize();
    uniforms.uLightStrength.value = lightStrength;
    uniforms.uRoughness.value = roughness;

    // The cursor is sized in CSS pixels and placed in device pixels
    // (gl_FragCoord), so it keeps a system cursor's size at any zoom.
    const { uv, onCanvas, pressed } = cursor.current;
    const cssPixel = state.gl.getPixelRatio(); // device pixels per CSS pixel
    press.current = THREE.MathUtils.damp(press.current, pressed ? 1 : 0, CURSOR_PRESS_SMOOTHING, delta);
    state.gl.getDrawingBufferSize(drawingBufferSize);
    uniforms.uCursorVisible.value = cursorEnabled && onCanvas;
    uniforms.uCursorPosition.value.copy(uv).multiply(drawingBufferSize);
    uniforms.uCursorRadius.value =
      CURSOR_RADIUS * THREE.MathUtils.lerp(1, CURSOR_PRESSED_SCALE, press.current) * cssPixel;
    uniforms.uCursorLineWidth.value = CURSOR_LINE_WIDTH * cssPixel;
    uniforms.uCursorDistortion.value = CURSOR_DISTORTION * cssPixel;
    render();
  }, OUTPUT_FRAME_ORDER);

  return null;
}
