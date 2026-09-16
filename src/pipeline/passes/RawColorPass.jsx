import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { FBO_OPTIONS, RAW_COLOR_PASS_FRAME_ORDER } from '../../config';

/** Captures the unstyled scene with its original materials. */
export function RawColorPass({ outputRef }) {
  const { gl, scene, camera, size } = useThree();
  const target = useFBO(size.width, size.height, FBO_OPTIONS);
  const savedClearColor = useRef(new THREE.Color()).current;

  if (outputRef) outputRef.current = target;

  useFrame(() => {
    const previousTarget = gl.getRenderTarget();
    const previousClearAlpha = gl.getClearAlpha();
    gl.getClearColor(savedClearColor);

    gl.setRenderTarget(target);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    gl.render(scene, camera);

    gl.setRenderTarget(previousTarget);
    gl.setClearColor(savedClearColor, previousClearAlpha);
  }, RAW_COLOR_PASS_FRAME_ORDER);

  return null;
}
