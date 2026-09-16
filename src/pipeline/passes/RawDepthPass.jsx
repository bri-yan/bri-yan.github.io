import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { RAW_DEPTH_FBO_OPTIONS, RAW_DEPTH_PASS_FRAME_ORDER } from '../../config';
import rawDepthVertex from '../../shaders/rawDepthVertex.vert?raw';
import rawDepthFragment from '../../shaders/rawDepthFragment.frag?raw';

/** Independent scene capture: R = linear view distance, A = coverage. */
export function RawDepthPass({ outputRef }) {
  const { gl, scene, camera, size } = useThree();
  const target = useFBO(size.width, size.height, RAW_DEPTH_FBO_OPTIONS);
  const savedClearColor = useRef(new THREE.Color());
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: rawDepthVertex,
        fragmentShader: rawDepthFragment,
        depthTest: true,
        depthWrite: true,
      }),
    []
  );

  if (!gl.capabilities.isWebGL2 || !gl.extensions.has('EXT_color_buffer_float')) {
    throw new Error('RawDepthPass requires WebGL2 with EXT_color_buffer_float support.');
  }

  if (outputRef) outputRef.current = target;

  useFrame(() => {
    const previousTarget = gl.getRenderTarget();
    const previousOverride = scene.overrideMaterial;
    const previousClearAlpha = gl.getClearAlpha();
    gl.getClearColor(savedClearColor.current);

    scene.overrideMaterial = material;
    gl.setRenderTarget(target);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    gl.render(scene, camera);

    scene.overrideMaterial = previousOverride;
    gl.setRenderTarget(previousTarget);
    gl.setClearColor(savedClearColor.current, previousClearAlpha);
  }, RAW_DEPTH_PASS_FRAME_ORDER);

  return null;
}
