import * as THREE from 'three';
import { CANVAS_CAMERA, MIN_PAPER_SCALE } from '../../config';

const ORIGIN = new THREE.Vector3();
const REFERENCE_DISTANCE = new THREE.Vector3(...CANVAS_CAMERA.position).length();

/**
 * How much the camera has zoomed in since the start, so the paper can grow
 * with the subject: 1 at the initial distance, 2 at half the distance. Uses
 * the default controls' target (the point zoom moves toward) when present.
 */
export function paperZoom({ camera, controls }) {
  if (camera.isOrthographicCamera) return camera.zoom;
  const distance = camera.position.distanceTo(controls?.target ?? ORIGIN);
  return (camera.zoom * REFERENCE_DISTANCE) / Math.max(distance, 1e-3);
}

/**
 * The substrate scale in effect at the current zoom (CSS pixels per paper
 * unit). Floored so zooming far out can't shrink the tooth below the pixel
 * grid and alias.
 */
export function zoomedPaperScale(state, scale) {
  return Math.max(scale * paperZoom(state), MIN_PAPER_SCALE);
}
