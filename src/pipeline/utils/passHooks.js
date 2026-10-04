import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { TARGET_OPTIONS } from '../../config';
import { createFullscreenQuad, renderFullscreenQuad } from './fullscreenQuad';
import fullscreenVertex from '../../shaders/fullscreenVertex.vert?raw';

/**
 * Shared scaffolding for image-space passes: a ShaderMaterial on a fullscreen
 * quad plus, when offscreen, a canvas-sized FBO to render into.
 *
 * @param fragmentShader - GLSL fragment source (vertex is always fullscreenVertex)
 * @param makeUniforms - Factory returning the initial uniforms object
 * @param offscreen - false for passes that draw to the screen (target is null)
 * @param fboOptions - render-target settings for the offscreen FBO (`count` > 1 for MRT)
 * @param glslVersion - THREE.GLSL3 for shaders that declare their own outputs (MRT)
 * @returns { target, uniforms, render } - render(to = target) draws the quad
 */
export function useFullscreenPass(
  fragmentShader,
  makeUniforms,
  { offscreen = true, fboOptions = TARGET_OPTIONS, glslVersion = null } = {}
) {
  const { gl } = useThree();
  // Hooks can't be conditional; to-screen passes get a dummy 1×1 FBO.
  const fbo = useFBO(
    offscreen ? fboOptions : 1,
    offscreen ? undefined : 1,
    offscreen ? undefined : TARGET_OPTIONS
  );
  const target = offscreen ? fbo : null;

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVertex,
        fragmentShader,
        uniforms: makeUniforms(),
        glslVersion,
        depthTest: false,
        depthWrite: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; uniforms are synced per frame
    []
  );
  const quad = useMemo(() => createFullscreenQuad(material), [material]);

  const render = (to = target) => renderFullscreenQuad(gl, quad, material, to);
  return { target, uniforms: material.uniforms, render };
}
