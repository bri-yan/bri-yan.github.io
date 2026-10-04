import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Tracks the mouse for the painting's own cursor (drawn by OutputPass) and
 * hides the system cursor over the canvas while `enabled`. The pointer counts
 * as on the painting only while the canvas is the event target, or holds
 * pointer capture as OrbitControls does mid-drag, so the plates over the
 * canvas keep their own cursors. Touch never shows it.
 *
 * @returns ref to { uv, onCanvas, pressed }, mutated by the listeners; read it
 *   each frame. `uv` is the pointer in canvas UV (y up).
 */
export function usePaintingCursor(enabled) {
  const canvas = useThree((state) => state.gl.domElement);
  const cursor = useRef({ uv: new THREE.Vector2(), onCanvas: false, pressed: false });

  useEffect(() => {
    if (!enabled) return undefined;
    const state = cursor.current;

    const reset = () => {
      state.onCanvas = false;
      state.pressed = false;
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
        state.pressed = state.onCanvas;
      },
      pointerup: () => {
        state.pressed = false;
      },
      pointercancel: reset,
      // No related target: the pointer left the window.
      pointerout: (event) => {
        if (!event.relatedTarget) state.onCanvas = false;
      },
      blur: reset,
    };

    Object.entries(listeners).forEach(([type, listener]) => window.addEventListener(type, listener));
    canvas.style.cursor = 'none';
    return () => {
      Object.entries(listeners).forEach(([type, listener]) => window.removeEventListener(type, listener));
      canvas.style.cursor = '';
      reset();
    };
  }, [canvas, enabled]);

  return cursor;
}
