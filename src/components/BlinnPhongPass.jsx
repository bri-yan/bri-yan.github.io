import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import blinnPhongVertexShader from '../shaders/blinnPhongVertex.vert?raw';
import blinnPhongFragmentShader from '../shaders/blinnPhongFragment.frag?raw';

const FBO_OPTIONS = {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat,
};

/**
 * Renders the scene with Blinn-Phong lighting to an FBO.
 * Returns the FBO target for use in compositor.
 */
export function BlinnPhongPass({ children, outputRef }) {
  const { gl, scene, camera, size } = useThree();

  // Create FBO for Blinn-Phong output
  const blinnPhongTarget = useFBO(size.width, size.height, FBO_OPTIONS);

  // Store reference for compositor
  if (outputRef) {
    outputRef.current = blinnPhongTarget;
  }

  // Scene setup for rendering with custom material
  const customScene = useMemo(() => new THREE.Scene(), []);
  const materialsCache = useRef(new Map());

  // Blinn-Phong material factory
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
    // Clone scene and replace materials with Blinn-Phong
    customScene.children = [];
    scene.traverse((child) => {
      if (child.isMesh && child !== customScene) {
        const clonedMesh = child.clone();

        // Use cached material or create new one
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

    // Render to FBO
    gl.setRenderTarget(blinnPhongTarget);
    gl.clear();
    gl.render(customScene, camera);
    gl.setRenderTarget(null);
  }, 1);

  return <>{children}</>;
}
