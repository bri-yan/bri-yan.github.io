import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { FBO_OPTIONS, PASS_FRAME_ORDER } from '../constants';
import { populateSceneWithClonedMeshes } from '../utils/sceneWithMaterials';
import rawVertexShader from '../shaders/rawVertex.vert?raw';
import rawFragmentShader from '../shaders/rawFragment.frag?raw';

/** Renders the scene unlit (base mesh color only) to an FBO. Uses scene background for clear color. */
export function RawPass({ outputRef }) {
  const { gl, scene, camera, size } = useThree();
  const target = useFBO(size.width, size.height, FBO_OPTIONS);
  const customScene = useMemo(() => new THREE.Scene(), []);
  const materialsCache = useRef(new Map());
  const savedClearColor = useRef(new THREE.Color());
  const savedClearAlpha = useRef(1);

  if (outputRef) outputRef.current = target;

  const getMaterial = useMemo(
    () => (originalMaterial) => {
      const baseColor = originalMaterial.color ?? new THREE.Color(0xffffff);
      return new THREE.ShaderMaterial({
        vertexShader: rawVertexShader,
        fragmentShader: rawFragmentShader,
        uniforms: { uDiffuseColor: { value: baseColor } },
      });
    },
    []
  );

  useFrame(() => {
    populateSceneWithClonedMeshes(scene, customScene, getMaterial, materialsCache.current);

    gl.setRenderTarget(target);
    gl.getClearColor(savedClearColor.current);
    savedClearAlpha.current = gl.getClearAlpha();
    if (scene.background) {
      const bg = scene.background.isColor ? scene.background : new THREE.Color(scene.background);
      gl.setClearColor(bg, 1);
    }
    gl.clear();
    gl.render(customScene, camera);
    gl.setClearColor(savedClearColor.current, savedClearAlpha.current);
    gl.setRenderTarget(null);
  }, PASS_FRAME_ORDER);

  return null;
}
