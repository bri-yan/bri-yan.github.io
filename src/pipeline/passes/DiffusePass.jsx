import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  DEFAULT_BLINN_PHONG_LIGHT_POSITION,
  DEFAULT_BLINN_PHONG_AMBIENT_STRENGTH,
  DEFAULT_BLINN_PHONG_DIFFUSE_STRENGTH,
} from '../../config';
import { useSceneRenderPass, toVector3 } from '../utils/sceneWithMaterials';
import lightingVertex from '../../shaders/lightingVertex.vert?raw';
import diffuseFragment from '../../shaders/diffuseFragment.frag?raw';

/** Renders the scene with ambient + diffuse (Lambertian) lighting to an FBO. */
export function DiffusePass({
  outputRef,
  lightPosition = DEFAULT_BLINN_PHONG_LIGHT_POSITION,
  ambientStrength = DEFAULT_BLINN_PHONG_AMBIENT_STRENGTH,
  diffuseStrength = DEFAULT_BLINN_PHONG_DIFFUSE_STRENGTH,
}) {
  const materialsRef = useRef(new Set());
  const lightPosVec = useRef(toVector3(lightPosition)).current;

  useFrame(() => {
    if (Array.isArray(lightPosition)) lightPosVec.fromArray(lightPosition);
    else if (lightPosition?.isVector3) lightPosVec.copy(lightPosition);
    materialsRef.current.forEach((mat) => {
      const u = mat.uniforms;
      u.uLightPosition.value.copy(lightPosVec);
      u.uAmbientStrength.value = ambientStrength;
      u.uDiffuseStrength.value = diffuseStrength;
    });
  }, -1);

  const getMaterial = useMemo(
    () => (originalMaterial) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: lightingVertex,
        fragmentShader: diffuseFragment,
        uniforms: {
          uLightPosition: { value: lightPosVec.clone() },
          uAmbientStrength: { value: ambientStrength },
          uDiffuseStrength: { value: diffuseStrength },
        },
      });
      materialsRef.current.add(mat);
      return mat;
    },
    [diffuseFragment]
  );

  const target = useSceneRenderPass(getMaterial, diffuseFragment);
  if (outputRef) outputRef.current = target;
  return null;
}
