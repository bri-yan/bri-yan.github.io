import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { FBO_OPTIONS, PASS_FRAME_ORDER } from '../constants';

/**
 * Renders the main scene directly to an FBO. Use when the scene already uses
 * unlit materials (e.g. MeshBasicMaterial) so no material replacement is needed.
 */
export function RawPass({ outputRef }) {
  const { gl, scene, camera, size } = useThree();
  const target = useFBO(size.width, size.height, FBO_OPTIONS);
  const savedClearColor = useRef(new THREE.Color());
  const savedClearAlpha = useRef(1);

  if (outputRef) outputRef.current = target;

  useFrame(() => {
    gl.setRenderTarget(target);
    gl.getClearColor(savedClearColor.current);
    savedClearAlpha.current = gl.getClearAlpha();
    if (scene.background) {
      const bg = scene.background.isColor ? scene.background : new THREE.Color(scene.background);
      gl.setClearColor(bg, 1);
    }
    gl.clear();
    gl.render(scene, camera);
    gl.setClearColor(savedClearColor.current, savedClearAlpha.current);
    gl.setRenderTarget(null);
  }, PASS_FRAME_ORDER);

  return null;
}
