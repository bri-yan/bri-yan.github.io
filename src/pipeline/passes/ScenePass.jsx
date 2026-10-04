import { useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { FBO_OPTIONS, SCENE_PASS_FRAME_ORDER } from '../../config';
import { usePaintFrame } from '../PaintingFrame';

/**
 * Captures the unstyled scene with its original materials (the scene probe).
 * Nothing downstream reads it, so it only renders while `active` (viewed).
 */
export function ScenePass({ outputRef, active = true }) {
  const { gl, scene, camera } = useThree();
  const target = useFBO(FBO_OPTIONS);
  const savedClearColor = useRef(new THREE.Color()).current;

  if (outputRef) outputRef.current = target;

  usePaintFrame(() => {
    if (!active) return;
    const previousTarget = gl.getRenderTarget();
    const previousClearAlpha = gl.getClearAlpha();
    gl.getClearColor(savedClearColor);

    gl.setRenderTarget(target);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    gl.render(scene, camera);

    gl.setRenderTarget(previousTarget);
    gl.setClearColor(savedClearColor, previousClearAlpha);
  }, SCENE_PASS_FRAME_ORDER);

  return null;
}
