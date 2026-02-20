import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { FBO_OPTIONS, PASS_FRAME_ORDER } from '../../config';
import { createFullscreenQuad, renderFullscreenQuad } from '../utils/fullscreenQuad';
import fullscreenVertex from '../../shaders/fullscreenVertex.vert?raw';
import paperTextureFragment from '../../shaders/paperTextureFragment.frag?raw';

/**
 * Loads a paper texture, converts its RGB values to an alpha channel via
 * length(rgb), and outputs to an FBO at the pipeline resolution.
 * The resulting FBO has rgb = paper colors and alpha = ridge/valley mask.
 */
export function PaperTexturePass({ outputRef, repeatX = 1, repeatY = 1 }) {
  const { gl, size } = useThree();
  const target = useFBO(size.width, size.height, FBO_OPTIONS);

  if (outputRef) outputRef.current = target;

  const paperTexture = useTexture('/textures/paper.jpg', (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
  });

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVertex,
        fragmentShader: paperTextureFragment,
        uniforms: {
          tPaper: { value: null },
          uRepeat: { value: new THREE.Vector2(repeatX, repeatY) },
        },
      }),
    []
  );

  const quad = useMemo(() => createFullscreenQuad(material), [material]);
  const uniforms = material.uniforms;

  useFrame(() => {
    uniforms.uRepeat.value.set(repeatX, repeatY);
  }, -1);

  useFrame(() => {
    uniforms.tPaper.value = paperTexture;
    renderFullscreenQuad(gl, quad, material, target);
  }, PASS_FRAME_ORDER);

  return null;
}
