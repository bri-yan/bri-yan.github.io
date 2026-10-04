import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CURSOR_DISTORTION,
  CURSOR_LINE_WIDTH,
  CURSOR_PRESS_SMOOTHING,
  CURSOR_PRESSED_SCALE,
  CURSOR_RADIUS,
  OUTPUT_FRAME_ORDER,
} from '../../config';
import { usePaintingCursor } from '../utils/paintingCursor';
import { useFullscreenPass } from '../utils/passHooks';
import { zoomedPaperScale } from '../utils/paperZoom';
import { pixelsPerStageUnit } from '../utils/viewScale';
import paperSlopeChunk from '../../shaders/chunks/paperSlope.glsl?raw';
import outputFragment from '../../shaders/outputFragment.frag?raw';

const fragmentShader = `${paperSlopeChunk}\n${outputFragment}`;

const drawingBufferSize = new THREE.Vector2();
// A generous bound on the paper slope (per paper unit; the tooth stays well
// under 8), so the cursor's reach covers wherever the slope can push the ring.
const MAX_PAPER_SLOPE = 16;
const PRESS_SETTLED = 1e-3;

/**
 * Draws every rendered frame to screen: the finished painting (CompositePass)
 * with the cursor over it in place of the system one. The canvas renders on
 * demand, so frames that only move the cursor cost this one cheap pass.
 */
export function OutputPass({ paintingRef, substrateRef, substrateScale }) {
  const cursor = usePaintingCursor();
  const press = useRef(0);
  const { uniforms, render } = useFullscreenPass(
    fragmentShader,
    () => ({
      tPainting: { value: null },
      tSubstrate: { value: null },
      uSubstrateTexelSize: { value: new THREE.Vector2() },
      uPixelsPerPaperUnit: { value: 1 },
      uCursorVisible: { value: false },
      uCursorPosition: { value: new THREE.Vector2() },
      uCursorRadius: { value: 0 },
      uCursorLineWidth: { value: 0 },
      uCursorDistortion: { value: 0 },
      uCursorReach: { value: 0 },
    }),
    { offscreen: false }
  );

  useFrame((state, delta) => {
    const painting = paintingRef.current;
    const substrate = substrateRef.current;
    if (!painting || !substrate) return;

    uniforms.tPainting.value = painting.texture;
    uniforms.tSubstrate.value = substrate.texture;
    uniforms.uSubstrateTexelSize.value.set(1 / substrate.width, 1 / substrate.height);
    uniforms.uPixelsPerPaperUnit.value = pixelsPerStageUnit(state) * zoomedPaperScale(state, substrateScale);

    // The cursor is sized in CSS pixels and placed in device pixels
    // (gl_FragCoord), so it keeps a system cursor's size at any zoom.
    const { uv, onCanvas, pressed, pressChangedAt } = cursor.current;
    const cssPixel = state.gl.getPixelRatio(); // device pixels per CSS pixel
    const pressTarget = pressed ? 1 : 0;
    // After an idle spell the frame delta spans it; the ease starts at the press.
    const step = Math.min(delta, (performance.now() - pressChangedAt) / 1000);
    press.current = THREE.MathUtils.damp(press.current, pressTarget, CURSOR_PRESS_SMOOTHING, step);
    if (Math.abs(press.current - pressTarget) > PRESS_SETTLED) state.invalidate();
    else press.current = pressTarget;
    const radius = CURSOR_RADIUS * THREE.MathUtils.lerp(1, CURSOR_PRESSED_SCALE, press.current);
    state.gl.getDrawingBufferSize(drawingBufferSize);
    uniforms.uCursorVisible.value = onCanvas;
    uniforms.uCursorPosition.value.copy(uv).multiply(drawingBufferSize);
    uniforms.uCursorRadius.value = radius * cssPixel;
    uniforms.uCursorLineWidth.value = CURSOR_LINE_WIDTH * cssPixel;
    uniforms.uCursorDistortion.value = CURSOR_DISTORTION * cssPixel;
    uniforms.uCursorReach.value =
      (radius + CURSOR_LINE_WIDTH + 1 + CURSOR_DISTORTION * MAX_PAPER_SLOPE) * cssPixel;
    render();
  }, OUTPUT_FRAME_ORDER);

  return null;
}
