import { useLayoutEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CANVAS_CAMERA } from '../config';

const DISTANCE = new THREE.Vector3(...CANVAS_CAMERA.position).length();
const DEG_TO_RAD = Math.PI / 180;

/**
 * Frames the camera for the first view on a sphere around the origin at the
 * default distance, at the view's azimuth and elevation (degrees). After that
 * the camera belongs to the viewer: switching views leaves it exactly where it
 * is, so the painting can change under an unchanged view.
 */
export function ViewCamera({ view }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls);
  const invalidate = useThree((state) => state.invalidate);
  const framed = useRef(false);

  useLayoutEffect(() => {
    if (!controls || framed.current) return; // the controls register just before this runs again
    framed.current = true;
    const azimuth = (view.camera?.azimuth ?? 0) * DEG_TO_RAD;
    const elevation = (view.camera?.elevation ?? 0) * DEG_TO_RAD;
    controls.target.set(0, 0, 0);
    camera.position
      .set(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation))
      .multiplyScalar(DISTANCE);
    controls.update();
    invalidate();
  }, [camera, controls, invalidate, view]);

  return null;
}
