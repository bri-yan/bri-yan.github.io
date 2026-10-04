import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Tracks the mouse for the painting's own cursor (drawn by OutputPass) and
 * hides the system cursor over the canvas. The pointer counts as on the
 * painting only while the canvas is the event target, or holds pointer
 * capture as OrbitControls does mid-drag, so the plates over the canvas keep
 * their own cursors. Touch never shows it. The canvas renders on demand, so
 * every pointer change requests a frame.
 *
 * @returns ref to { uv, onCanvas, pressed, pressChangedAt }, mutated by the
 *   listeners; read it each frame. `uv` is the pointer in canvas UV (y up);
 *   `pressChangedAt` is the performance.now() of the last press or release.
 */
export function usePaintingCursor() {
  const canvas = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);
  const cursor = useRef({ uv: new THREE.Vector2(), onCanvas: false, pressed: false, pressChangedAt: 0 });

  useEffect(() => {
    const state = cursor.current;

    const setPressed = (pressed) => {
      if (pressed !== state.pressed) state.pressChangedAt = performance.now();
      state.pressed = pressed;
    };
    const reset = () => {
      state.onCanvas = false;
      setPressed(false);
    };
    const listeners = {
      pointermove: (event) => {
        const bounds = canvas.getBoundingClientRect();
        state.uv.set(
          (event.clientX - bounds.left) / bounds.width,
          1 - (event.clientY - bounds.top) / bounds.height
        );
        state.onCanvas = event.target === canvas && event.pointerType !== 'touch';
      },
      pointerdown: (event) => {
        listeners.pointermove(event);
        setPressed(state.onCanvas);
      },
      pointerup: () => setPressed(false),
      pointercancel: reset,
      // No related target: the pointer left the window.
      pointerout: (event) => {
        if (!event.relatedTarget) state.onCanvas = false;
      },
      blur: reset,
    };
    // A move that neither starts nor ends over the painting (e.g. across the
    // controls) changes nothing on screen.
    const handlers = Object.entries(listeners).map(([type, listener]) => [
      type,
      (event) => {
        const wasOnCanvas = state.onCanvas;
        listener(event);
        if (type !== 'pointermove' || wasOnCanvas || state.onCanvas) invalidate();
      },
    ]);

    handlers.forEach(([type, handler]) => window.addEventListener(type, handler));
    canvas.style.cursor = 'none';
    return () => {
      handlers.forEach(([type, handler]) => window.removeEventListener(type, handler));
      canvas.style.cursor = '';
      reset();
    };
  }, [canvas, invalidate]);

  return cursor;
}
