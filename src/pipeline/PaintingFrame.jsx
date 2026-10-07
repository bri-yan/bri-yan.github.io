/* eslint-disable react-refresh/only-export-components -- hooks share this provider context. */
import { createContext, useCallback, useContext, useLayoutEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PAINTING_CHECK_FRAME_ORDER } from '../config';
import { useWatercolorSubjects } from './WatercolorSubjects';

const PaintingFrameContext = createContext(null);
const bufferSize = new THREE.Vector2();
// OrbitControls' damping eases the camera forever in ever-smaller steps, so
// matrices are compared with a tolerance: about a tenth of a pixel of motion
// at the default framing. Drift adds up against the last painted state, so it
// still repaints once it shows.
const MATRIX_EPSILON = 1e-4;
// Frames render on demand, and drei's OrbitControls stops asking for them
// while its damping still drifts (under 1e-3 units a frame), which would leave
// the painting short of where the camera comes to rest. Frames keep coming
// until the camera moves less than this per frame, a few hundred-thousandths
// of a unit from rest; most of them only redraw the output.
const STILL_EPSILON = 1e-6;

/** Copies `current` into `last`; true if any element moved past the tolerance. */
function track(current, last, epsilon = MATRIX_EPSILON) {
  const a = current.elements;
  const b = last.elements;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > epsilon) {
      last.copy(current);
      return true;
    }
  }
  return false;
}

/**
 * Repaints only when the painting can have changed. Every pass before the
 * output keeps its result in its FBO, so they all skip a frame unless the
 * camera, a subject, or the drawing-buffer size moved, or the pipeline or a
 * pass re-rendered (new props, a new subject, a resize, a hot reload). The
 * canvas renders on demand, so a stale painting also requests a frame; the
 * output alone (one cheap pass) draws frames that only move the cursor.
 */
export function PaintingFrameProvider({ children }) {
  const subjects = useWatercolorSubjects();
  const invalidate = useThree((state) => state.invalidate);
  // Subscribed so a resize or density change re-renders, which repaints.
  useThree((state) => state.size);
  useThree((state) => state.viewport.dpr);
  const frame = useMemo(
    () => ({
      stale: true,
      repaint: true,
      camera: new THREE.Matrix4(),
      previousCamera: new THREE.Matrix4(),
      projection: new THREE.Matrix4(),
      bufferSize: new THREE.Vector2(),
      meshes: new WeakMap(),
    }),
    []
  );

  // Every render follows a prop, subject, or size change.
  useLayoutEffect(() => {
    frame.stale = true;
    invalidate();
  });

  useFrame(({ camera, gl }) => {
    let moved = frame.stale;
    frame.stale = false;

    camera.updateMatrixWorld();
    if (track(camera.matrixWorld, frame.previousCamera, STILL_EPSILON)) invalidate();
    if (track(camera.matrixWorld, frame.camera)) moved = true;
    if (track(camera.projectionMatrix, frame.projection)) moved = true;
    gl.getDrawingBufferSize(bufferSize);
    if (!bufferSize.equals(frame.bufferSize)) {
      frame.bufferSize.copy(bufferSize);
      moved = true;
    }

    subjects.forEach(({ ref }) => {
      const object = ref.current;
      if (!object) return;
      object.updateWorldMatrix(true, true);
      object.traverse((mesh) => {
        if (!mesh.isMesh) return;
        let last = frame.meshes.get(mesh);
        if (!last) {
          last = new THREE.Matrix4();
          frame.meshes.set(mesh, last);
          moved = true;
        }
        if (track(mesh.matrixWorld, last)) moved = true;
      });
    });

    frame.repaint = moved;
  }, PAINTING_CHECK_FRAME_ORDER);

  return <PaintingFrameContext.Provider value={frame}>{children}</PaintingFrameContext.Provider>;
}

/** Returns a function that marks the painting stale and asks for a frame. */
export function useRepaint() {
  const frame = useContext(PaintingFrameContext);
  if (!frame) throw new Error('useRepaint must be used inside MultiPassPipeline.');
  const invalidate = useThree((state) => state.invalidate);
  return useCallback(() => {
    frame.stale = true;
    invalidate();
  }, [frame, invalidate]);
}

/**
 * useFrame for the passes that build the painting: the callback runs only on
 * frames that repaint (see PaintingFrameProvider). Re-rendering the pass, as a
 * prop change or a hot reload does, repaints.
 */
export function usePaintFrame(callback, priority) {
  const frame = useContext(PaintingFrameContext);
  if (!frame) throw new Error('usePaintFrame must be used inside MultiPassPipeline.');
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    frame.stale = true;
    invalidate();
  });

  useFrame((state, delta) => {
    if (frame.repaint) callback(state, delta);
  }, priority);
}
