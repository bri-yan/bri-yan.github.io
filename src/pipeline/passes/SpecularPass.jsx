import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  DEFAULT_BLINN_PHONG_LIGHT_POSITION,
  DEFAULT_BLINN_PHONG_SHININESS,
  DEFAULT_BLINN_PHONG_SPECULAR_STRENGTH,
  DEFAULT_BLINN_PHONG_SPECULAR_THRESHOLD,
} from '../../config';
import { useSceneRenderPass, toVector3 } from '../utils/sceneWithMaterials';
import lightingVertex from '../../shaders/lightingVertex.vert?raw';
import specularFragment from '../../shaders/specularFragment.frag?raw';

/** Renders the scene with Blinn-Phong specular lighting to an FBO. */
export function SpecularPass({
  outputRef,
  lightPosition = DEFAULT_BLINN_PHONG_LIGHT_POSITION,
  shininess = DEFAULT_BLINN_PHONG_SHININESS,
  specularStrength = DEFAULT_BLINN_PHONG_SPECULAR_STRENGTH,
  specularThreshold = DEFAULT_BLINN_PHONG_SPECULAR_THRESHOLD,
}) {
  const materialsRef = useRef(new Set());
  const lightPosVec = useRef(toVector3(lightPosition)).current;

  useFrame(() => {
    if (Array.isArray(lightPosition)) lightPosVec.fromArray(lightPosition);
    else if (lightPosition?.isVector3) lightPosVec.copy(lightPosition);
    materialsRef.current.forEach((mat) => {
      const u = mat.uniforms;
      u.uLightPosition.value.copy(lightPosVec);
      u.uShininess.value = shininess;
      u.uSpecularStrength.value = specularStrength;
      u.uSpecularThreshold.value = specularThreshold;
    });
  }, -1);

  const getMaterial = useMemo(
    () => (originalMaterial) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: lightingVertex,
        fragmentShader: specularFragment,
        uniforms: {
          uLightPosition: { value: lightPosVec.clone() },
          uShininess: { value: shininess },
          uSpecularStrength: { value: specularStrength },
          uSpecularThreshold: { value: specularThreshold },
        },
      });
      materialsRef.current.add(mat);
      return mat;
    },
    [specularFragment]
  );

  const target = useSceneRenderPass(getMaterial, specularFragment);
  if (outputRef) outputRef.current = target;
  return null;
}
