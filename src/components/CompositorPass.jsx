import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  compositorVertexShader,
  compositorFragmentShader,
} from '../shaders/compositorShaders';

/**
 * Composites multiple FBO outputs into final image.
 * Takes refs to BlinnPhong and Blur FBOs.
 */
export function CompositorPass({
  blinnPhongRef,
  blurRef,
  blinnPhongWeight = 0.6,
  blurWeight = 0.4,
  blendMode = 0, // 0 = additive, 1 = multiply, 2 = screen
}) {
  const { gl, size } = useThree();

  // Fullscreen quad setup
  const quadScene = useMemo(() => new THREE.Scene(), []);
  const quadCamera = useMemo(
    () => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
    []
  );

  const compositorMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: compositorVertexShader,
        fragmentShader: compositorFragmentShader,
        uniforms: {
          tBlinnPhong: { value: null },
          tBlur: { value: null },
          uBlinnPhongWeight: { value: blinnPhongWeight },
          uBlurWeight: { value: blurWeight },
          uBlendMode: { value: blendMode },
        },
      }),
    []
  );

  const quadMesh = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, compositorMaterial);
    quadScene.add(mesh);
    return mesh;
  }, [quadScene, compositorMaterial]);

  // Update uniforms from props
  useFrame(() => {
    compositorMaterial.uniforms.uBlinnPhongWeight.value = blinnPhongWeight;
    compositorMaterial.uniforms.uBlurWeight.value = blurWeight;
    compositorMaterial.uniforms.uBlendMode.value = blendMode;
  }, -1);

  useFrame(() => {
    // Get textures from refs
    if (blinnPhongRef?.current && blurRef?.current) {
      compositorMaterial.uniforms.tBlinnPhong.value = blinnPhongRef.current.texture;
      compositorMaterial.uniforms.tBlur.value = blurRef.current.texture;

      // Render compositor to screen
      gl.setRenderTarget(null);
      gl.clear();
      gl.render(quadScene, quadCamera);
    }
  }, 2); // Render last, after all passes

  return null;
}
