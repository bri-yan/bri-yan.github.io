import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ZOOM_PINCH_BOOST, ZOOM_SENSITIVITY, ZOOM_SMOOTHING } from '../config';

const WHEEL_LINE_PIXELS = 16;
const WHEEL_PAGE_PIXELS = 100;
const SETTLED_RATIO = 1e-3;
const toTarget = new THREE.Vector3();

/**
 * Damped wheel zoom for the default OrbitControls (render with
 * `enableZoom={false}`, which OrbitControls' own damping never smooths). Wheel
 * input accumulates into a target camera distance that the camera eases toward
 * every frame, so notches and trackpad pinches glide. The canvas renders on
 * demand, so it requests frames until the ease settles.
 */
export function SmoothZoom() {
  const { gl, camera, invalidate } = useThree();
  const controls = useThree((state) => state.controls);
  const targetDistance = useRef(null);
  const easeStart = useRef(0);

  useEffect(() => {
    const element = gl.domElement;
    const onWheel = (event) => {
      if (!controls) return;
      event.preventDefault();
      const unit =
        event.deltaMode === 1 ? WHEEL_LINE_PIXELS : event.deltaMode === 2 ? WHEEL_PAGE_PIXELS : 1;
      const boost = event.ctrlKey ? ZOOM_PINCH_BOOST : 1;
      if (targetDistance.current === null) easeStart.current = performance.now();
      const current = targetDistance.current ?? camera.position.distanceTo(controls.target);
      const next = current * Math.exp(event.deltaY * unit * boost * ZOOM_SENSITIVITY);
      targetDistance.current = THREE.MathUtils.clamp(next, controls.minDistance, controls.maxDistance);
      invalidate();
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [gl, camera, controls, invalidate]);

  // Before OrbitControls' update (priority -1), which then applies its damping on top.
  useFrame((_, delta) => {
    const target = targetDistance.current;
    if (target === null || !controls) return;
    // After an idle spell the frame delta spans it; the ease starts at the wheel.
    const step = Math.min(delta, (performance.now() - easeStart.current) / 1000);
    toTarget.copy(camera.position).sub(controls.target);
    const distance = toTarget.length();
    const next = THREE.MathUtils.damp(distance, target, ZOOM_SMOOTHING, step);
    camera.position.copy(controls.target).add(toTarget.setLength(next));
    if (Math.abs(next - target) < target * SETTLED_RATIO) targetDistance.current = null;
    else invalidate();
  }, -2);

  return null;
}
