import { useMemo } from 'react';
import * as THREE from 'three';
import { useSceneRenderPass } from '../utils/sceneWithMaterials';
import blinnPhongVertexShader from '../../shaders/blinnPhongVertex.vert?raw';
import blinnPhongFragmentShader from '../../shaders/blinnPhongFragment.frag?raw';

const LIGHT_POSITION = new THREE.Vector3(5, 5, 5);
const WHITE = new THREE.Color(0xffffff);
const AMBIENT_GRAY = new THREE.Color(0x404040);

/** Renders the scene with Blinn-Phong lighting to an FBO. */
export function BlinnPhongPass({ outputRef }) {
  const getMaterial = useMemo(
    () => (originalMaterial) => {
      const baseColor = originalMaterial?.color ?? new THREE.Color(0xffffff);
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
          uSpecularStrength: { value: 0.7 },
          uSpecularThreshold: { value: 0.3 },
          uHighlightColor: { value: WHITE.clone() },
        },
      });
    },
    []
  );
  const target = useSceneRenderPass(getMaterial);
  if (outputRef) outputRef.current = target;
  return null;
}
