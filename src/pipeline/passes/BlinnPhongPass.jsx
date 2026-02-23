import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  DEFAULT_BLINN_PHONG_LIGHT_POSITION,
  DEFAULT_BLINN_PHONG_SHININESS,
  DEFAULT_BLINN_PHONG_AMBIENT_STRENGTH,
  DEFAULT_BLINN_PHONG_DIFFUSE_STRENGTH,
  DEFAULT_BLINN_PHONG_SPECULAR_STRENGTH,
  DEFAULT_BLINN_PHONG_SPECULAR_THRESHOLD,
} from '../../config';
import { useSceneRenderPass } from '../utils/sceneWithMaterials';
import blinnPhongVertex from '../../shaders/blinnPhongVertex.vert?raw';
import blinnPhongFragment from '../../shaders/blinnPhongFragment.frag?raw';

const WHITE = new THREE.Color(0xffffff);
const AMBIENT = new THREE.Color(0x404040);

const toVector3 = (v) =>
  Array.isArray(v) ? new THREE.Vector3().fromArray(v) : v?.clone?.() ?? v;

/** Renders the scene with Blinn-Phong lighting to an FBO. */
export function BlinnPhongPass({
  outputRef,
  lightPosition = DEFAULT_BLINN_PHONG_LIGHT_POSITION,
  shininess = DEFAULT_BLINN_PHONG_SHININESS,
  ambientStrength = DEFAULT_BLINN_PHONG_AMBIENT_STRENGTH,
  diffuseStrength = DEFAULT_BLINN_PHONG_DIFFUSE_STRENGTH,
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
      u.uAmbientStrength.value = ambientStrength;
      u.uDiffuseStrength.value = diffuseStrength;
      u.uSpecularStrength.value = specularStrength;
      u.uSpecularThreshold.value = specularThreshold;
    });
  }, -1);

  const getMaterial = useMemo(
    () => (originalMaterial) => {
      const diffuseColor = originalMaterial?.color ?? WHITE;
      const mat = new THREE.ShaderMaterial({
        vertexShader: blinnPhongVertex,
        fragmentShader: blinnPhongFragment,
        uniforms: {
          uLightPosition: { value: lightPosVec.clone() },
          uLightColor: { value: WHITE },
          uAmbientColor: { value: AMBIENT },
          uDiffuseColor: { value: diffuseColor },
          uSpecularColor: { value: WHITE },
          uHighlightColor: { value: WHITE },
          uShininess: { value: shininess },
          uAmbientStrength: { value: ambientStrength },
          uDiffuseStrength: { value: diffuseStrength },
          uSpecularStrength: { value: specularStrength },
          uSpecularThreshold: { value: specularThreshold },
        },
      });
      materialsRef.current.add(mat);
      return mat;
    },
    [blinnPhongVertex, blinnPhongFragment]
  );

  const target = useSceneRenderPass(getMaterial, blinnPhongFragment);
  if (outputRef) outputRef.current = target;
  return null;
}
