import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { FBO_OPTIONS, PASS_FRAME_ORDER } from '../../config';
import { populateSceneWithClonedMeshes } from '../utils/sceneWithMaterials';
import blinnPhongVertexShader from '../../shaders/blinnPhongVertex.vert?raw';
import blinnPhongFragmentShader from '../../shaders/blinnPhongFragment.frag?raw';

const LIGHT_POSITION = new THREE.Vector3(5, 5, 5);
const WHITE = new THREE.Color(0xffffff);
const AMBIENT_GRAY = new THREE.Color(0x404040);

/** Renders the scene with Blinn-Phong lighting to an FBO. */
export function BlinnPhongPass({ outputRef }) {
  const { gl, scene, camera, size } = useThree();
  const target = useFBO(size.width, size.height, FBO_OPTIONS);
  const customScene = useMemo(() => new THREE.Scene(), []);
  const materialsCache = useRef(new Map());

  if (outputRef) outputRef.current = target;

  const getMaterial = useMemo(
    () => (originalMaterial) => {
      const baseColor = originalMaterial.color ?? new THREE.Color(0xffffff);
      return new THREE.ShaderMaterial({
        vertexShader: blinnPhongVertexShader,
        fragmentShader: blinnPhongFragmentShader,
        uniforms: {
          uLightPosition: { value: LIGHT_POSITION.clone() },
          uLightColor: { value: WHITE.clone() },
          uAmbientColor: { value: AMBIENT_GRAY.clone() },
          uDiffuseColor: { value: baseColor },
          uSpecularColor: { value: WHITE.clone() },
          uShininess: { value: 32 },
          uAmbientStrength: { value: 0.3 },
          uDiffuseStrength: { value: 0.7 },
          uSpecularStrength: { value: 0.5 },
          uSpecularThreshold: { value: 0.6 },
          uHighlightColor: { value: WHITE.clone() },
        },
      });
    },
    []
  );

  useFrame(() => {
    populateSceneWithClonedMeshes(scene, customScene, getMaterial, materialsCache.current);
    gl.setRenderTarget(target);
    gl.clear();
    gl.render(customScene, camera);
    gl.setRenderTarget(null);
  }, PASS_FRAME_ORDER);

  return null;
}
