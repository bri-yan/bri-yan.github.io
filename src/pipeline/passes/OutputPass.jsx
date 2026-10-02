import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MIN_PAPER_SCALE, OUTPUT_FRAME_ORDER } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import { zoomedPaperScale } from '../utils/paperZoom';
import outputFragment from '../../shaders/outputFragment.frag?raw';

const DEG_TO_RAD = Math.PI / 180;

/**
 * Draws the finished painting to screen: edge-darkened paint on paper with
 * specular highlights lifted to bare paper, and toggleable substrate effects.
 * Distortion shifts the paint along the paper slope; lighting shades
 * everything by paper normals rebuilt from that slope.
 */
export function OutputPass({
  paintRef,
  specularRef,
  substrateRef,
  paperColor,
  substrateScale,
  distortionEnabled,
  distortion,
  lightingEnabled,
  lightAngle,
  lightStrength,
  roughness,
}) {
  const { uniforms, render } = useFullscreenPass(
    outputFragment,
    () => ({
      tPaint: { value: null },
      tSpecular: { value: null },
      tSubstrate: { value: null },
      uCssPixelToUv: { value: new THREE.Vector2() },
      uSubstrateTexelSize: { value: new THREE.Vector2() },
      uPixelsPerPaperUnit: { value: 1 },
      uPaperColor: { value: paperColor },
      uDistortionEnabled: { value: true },
      uDistortion: { value: 0 },
      uLightingEnabled: { value: true },
      uLightDirection: { value: new THREE.Vector3() },
      uLightStrength: { value: 0 },
      uRoughness: { value: 1 },
    }),
    { offscreen: false }
  );

  useFrame((state) => {
    const { gl } = state;
    const paint = paintRef.current;
    const specular = specularRef.current;
    const substrate = substrateRef.current;
    if (!paint || !specular || !substrate) return;

    const pixelRatio = gl.getPixelRatio();
    const paperScale = zoomedPaperScale(state, substrateScale);
    // Distortion is a shift on the paper, so it magnifies along with it.
    const magnification = paperScale / Math.max(substrateScale, MIN_PAPER_SCALE);
    const angle = lightAngle * DEG_TO_RAD;
    uniforms.tPaint.value = paint.texture;
    uniforms.tSpecular.value = specular.texture;
    uniforms.tSubstrate.value = substrate.texture;
    uniforms.uCssPixelToUv.value.set(pixelRatio / paint.width, pixelRatio / paint.height);
    uniforms.uSubstrateTexelSize.value.set(1 / substrate.width, 1 / substrate.height);
    uniforms.uPixelsPerPaperUnit.value = pixelRatio * paperScale;
    uniforms.uPaperColor.value = paperColor;
    uniforms.uDistortionEnabled.value = distortionEnabled;
    uniforms.uDistortion.value = distortion * magnification;
    uniforms.uLightingEnabled.value = lightingEnabled;
    // Angle 0° = light from the right, counter-clockwise on screen; y is screen-down.
    uniforms.uLightDirection.value.set(Math.cos(angle), -Math.sin(angle), 1).normalize();
    uniforms.uLightStrength.value = lightStrength;
    uniforms.uRoughness.value = roughness;
    render();
  }, OUTPUT_FRAME_ORDER);

  return null;
}
