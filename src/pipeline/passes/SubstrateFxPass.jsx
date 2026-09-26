import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SUBSTRATE_FX_PASS_FRAME_ORDER } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import substrateFxFragment from '../../shaders/substrateFxFragment.frag?raw';

const DEG_TO_RAD = Math.PI / 180;

/**
 * Paint on paper with toggleable substrate effects: distortion shifts the
 * paint along the paper slope, lighting shades everything by paper normals
 * rebuilt from the gradient. Debug-only; output is unaffected.
 */
export function SubstrateFxPass({
  paintRef,
  gradientRef,
  outputRef,
  paperColor,
  distortionEnabled,
  distortion,
  lightingEnabled,
  lightAngle,
  lightStrength,
  roughness,
}) {
  const { target, uniforms, render } = useFullscreenPass(substrateFxFragment, () => ({
    tPaint: { value: null },
    tGradient: { value: null },
    uCssPixelToUv: { value: new THREE.Vector2() },
    uPaperColor: { value: paperColor },
    uDistortionEnabled: { value: true },
    uDistortion: { value: 0 },
    uLightingEnabled: { value: true },
    uLightDirection: { value: new THREE.Vector3() },
    uLightStrength: { value: 0 },
    uRoughness: { value: 1 },
  }));

  if (outputRef) outputRef.current = target;

  useFrame(({ gl }) => {
    const paint = paintRef.current;
    const gradient = gradientRef.current;
    if (!paint || !gradient) return;

    const pixelRatio = gl.getPixelRatio();
    const angle = lightAngle * DEG_TO_RAD;
    uniforms.tPaint.value = paint.texture;
    uniforms.tGradient.value = gradient.texture;
    uniforms.uCssPixelToUv.value.set(pixelRatio / paint.width, pixelRatio / paint.height);
    uniforms.uPaperColor.value = paperColor;
    uniforms.uDistortionEnabled.value = distortionEnabled;
    uniforms.uDistortion.value = distortion;
    uniforms.uLightingEnabled.value = lightingEnabled;
    // Angle 0° = light from the right, counter-clockwise on screen; y is screen-down.
    uniforms.uLightDirection.value.set(Math.cos(angle), -Math.sin(angle), 1).normalize();
    uniforms.uLightStrength.value = lightStrength;
    uniforms.uRoughness.value = roughness;
    render();
  }, SUBSTRATE_FX_PASS_FRAME_ORDER);

  return null;
}
