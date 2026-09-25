import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { FBO_OPTIONS, UNIFORM_SYNC_FRAME_ORDER } from '../../config';
import { createFullscreenQuad, renderFullscreenQuad } from './fullscreenQuad';
import fullscreenVertex from '../../shaders/fullscreenVertex.vert?raw';

/**
 * Shared scaffolding for image-space passes: a ShaderMaterial on a fullscreen
 * quad plus, when offscreen, a canvas-sized FBO to render into.
 *
 * @param fragmentShader - GLSL fragment source (vertex is always fullscreenVertex)
 * @param makeUniforms - Factory returning the initial uniforms object
 * @param offscreen - false for passes that draw to the screen (target is null)
 * @param fboOptions - render-target settings for the offscreen FBO
 * @returns { target, uniforms, render } - render(to = target) draws the quad
 */
export function useFullscreenPass(
  fragmentShader,
  makeUniforms,
  { offscreen = true, fboOptions = FBO_OPTIONS } = {}
) {
  const { gl } = useThree();
  // Hooks can't be conditional; to-screen passes get a dummy 1×1 FBO.
  const fbo = useFBO(
    offscreen ? fboOptions : 1,
    offscreen ? undefined : 1,
    offscreen ? undefined : fboOptions
  );
  const target = offscreen ? fbo : null;

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVertex,
        fragmentShader,
        uniforms: makeUniforms(),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; uniforms are synced per frame
    []
  );
  const quad = useMemo(() => createFullscreenQuad(material), [material]);

  const render = (to = target) => renderFullscreenQuad(gl, quad, material, to);
  return { target, uniforms: material.uniforms, render };
}

/**
 * Pushes the latest prop values into shader uniforms each frame, before any
 * pass renders. getValues returns { uniformName: value } — values are assigned
 * directly, so pass stable objects (e.g. memoized THREE.Color) for non-scalars.
 */
export function useUniformSync(uniforms, getValues) {
  useFrame(() => {
    const values = getValues();
    for (const name in values) uniforms[name].value = values[name];
  }, UNIFORM_SYNC_FRAME_ORDER);
}
