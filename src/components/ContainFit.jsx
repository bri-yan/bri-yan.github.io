import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CANVAS_CAMERA } from '../config';

const baseHalfFov = Math.tan(THREE.MathUtils.degToRad(CANVAS_CAMERA.fov / 2));

/**
 * Fits the camera to the window's short side, like `object-fit: contain`: the
 * subject keeps the same share of the screen in landscape (vertical FOV kept)
 * and in portrait (vertical FOV widened to keep the horizontal extent).
 */
export function ContainFit() {
  const camera = useThree((state) => state.camera);
  const aspect = useThree((state) => state.size.width / state.size.height);

  useLayoutEffect(() => {
    if (!(aspect > 0)) return; // not laid out yet (hidden or zero-size window)
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(baseHalfFov / Math.min(aspect, 1)));
    camera.updateProjectionMatrix();
  }, [camera, aspect]);

  return null;
}
