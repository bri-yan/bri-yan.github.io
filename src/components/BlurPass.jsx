import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import {
  vertexShader,
  horizontalBlurShader,
  verticalBlurShader,
} from '../shaders/blurShaders';

const FBO_OPTIONS = {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat,
};

/**
 * Renders children to an offscreen target, then applies a two-pass
 * (horizontal + vertical) 9-tap Gaussian blur and outputs to the screen.
 * If outputRef is provided, renders to FBO instead of screen.
 */
export function BlurPass({ children, outputRef }) {
  const { gl, scene, camera, size } = useThree();

  const offscreenTarget = useFBO(size.width, size.height, FBO_OPTIONS);
  const horizontalTarget = useFBO(size.width, size.height, FBO_OPTIONS);
  const verticalTarget = useFBO(size.width, size.height, FBO_OPTIONS);

  // Store reference for compositor if provided
  if (outputRef) {
    outputRef.current = verticalTarget;
  }

  const quadScene = useMemo(() => new THREE.Scene(), []);
  const quadCamera = useMemo(
    () => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
    []
  );

  const horizontalMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: horizontalBlurShader,
        uniforms: {
          tDiffuse: { value: null },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
        },
      }),
    []
  );

  const verticalMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: verticalBlurShader,
        uniforms: {
          tDiffuse: { value: null },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
        },
      }),
    []
  );

  const quadMesh = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, horizontalMaterial);
    quadScene.add(mesh);
    return mesh;
  }, [quadScene, horizontalMaterial]);

  useFrame(() => {
    horizontalMaterial.uniforms.uResolution.value.set(size.width, size.height);
    verticalMaterial.uniforms.uResolution.value.set(size.width, size.height);
  }, -1);

  useFrame(() => {
    gl.setRenderTarget(offscreenTarget);
    gl.clear();
    gl.render(scene, camera);

    quadMesh.material = horizontalMaterial;
    horizontalMaterial.uniforms.tDiffuse.value = offscreenTarget.texture;
    gl.setRenderTarget(horizontalTarget);
    gl.clear();
    gl.render(quadScene, quadCamera);

    quadMesh.material = verticalMaterial;
    verticalMaterial.uniforms.tDiffuse.value = horizontalTarget.texture;

    // If outputRef is provided, render to FBO; otherwise render to screen
    gl.setRenderTarget(outputRef ? verticalTarget : null);
    gl.clear();
    gl.render(quadScene, quadCamera);
  }, 1);

  return <>{children}</>;
}
