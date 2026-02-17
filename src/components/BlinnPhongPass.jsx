import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { FBO_OPTIONS } from '../constants';
import blinnPhongVertexShader from '../shaders/blinnPhongVertex.vert?raw';
import blinnPhongFragmentShader from '../shaders/blinnPhongFragment.frag?raw';

/**
 * Renders the scene with Blinn-Phong lighting to an FBO for the compositor.
 */
export function BlinnPhongPass({ children, outputRef }) {
  const { gl, scene, camera, size } = useThree();
  const blinnPhongTarget = useFBO(size.width, size.height, FBO_OPTIONS);
  if (outputRef) outputRef.current = blinnPhongTarget;

  const customScene = useMemo(() => new THREE.Scene(), []);
  const materialsCache = useRef(new Map());

  const createBlinnPhongMaterial = useMemo(() => {
    return (originalMaterial) => {
      const baseColor = originalMaterial.color || new THREE.Color(0xffffff);

      return new THREE.ShaderMaterial({
        vertexShader: blinnPhongVertexShader,
        fragmentShader: blinnPhongFragmentShader,
        uniforms: {
          uLightPosition: { value: new THREE.Vector3(5, 5, 5) },
          uLightColor: { value: new THREE.Color(0xffffff) },
          uAmbientColor: { value: new THREE.Color(0x404040) },
          uDiffuseColor: { value: baseColor },
          uSpecularColor: { value: new THREE.Color(0xffffff) },
          uShininess: { value: 32.0 },
          uAmbientStrength: { value: 0.3 },
          uDiffuseStrength: { value: 0.7 },
          uSpecularStrength: { value: 0.5 },
        },
      });
    };
  }, []);

  useFrame(() => {
    customScene.children = [];
    scene.traverse((child) => {
      if (child.isMesh && child !== customScene) {
        const clonedMesh = child.clone();
        if (!materialsCache.current.has(child.uuid)) {
          materialsCache.current.set(
            child.uuid,
            createBlinnPhongMaterial(child.material)
          );
        }
        clonedMesh.material = materialsCache.current.get(child.uuid);
        customScene.add(clonedMesh);
      }
    });

    gl.setRenderTarget(blinnPhongTarget);
    gl.clear();
    gl.render(customScene, camera);
    gl.setRenderTarget(null);
  }, 1);

  return <>{children}</>;
}
