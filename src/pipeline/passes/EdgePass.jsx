import { useFrame } from '@react-three/fiber';
import { PAINT_FRAME_ORDER } from '../../config';
import { useFullscreenPass, useUniformSync } from '../utils/passHooks';
import common from '../../shaders/chunks/common.glsl?raw';
import edgeFragment from '../../shaders/edgeFragment.frag?raw';

const fragment = `${common}\n${edgeFragment}`;

/**
 * The wet-front rim: carves the edge band out of the blurred silhouette ramp
 * (blurRef), also given the raw silhouette mask (intensityRef), and dries it
 * into the paper relief (paperRef).
 */
export function EdgePass({
  blurRef,
  intensityRef,
  paperRef,
  outputRef,
  baseColor,
  threshold,
  wetness,
  paperWeight,
  sharpness,
  darkness, // reserved — not yet used by the shader
}) {
  const { target, uniforms, render } = useFullscreenPass(fragment, () => ({
    tIntensity: { value: null },
    tBlur: { value: null },
    tPaper: { value: null },
    uBaseColor: { value: baseColor },
    uThreshold: { value: threshold },
    uWetness: { value: wetness },
    uEdgePaperWeight: { value: paperWeight },
    uEdgeSharpness: { value: sharpness },
    uEdgeDarkness: { value: darkness },
  }));

  if (outputRef) outputRef.current = target;

  useUniformSync(uniforms, () => ({
    uBaseColor: baseColor,
    uThreshold: threshold,
    uWetness: wetness,
    uEdgePaperWeight: paperWeight,
    uEdgeSharpness: sharpness,
    uEdgeDarkness: darkness,
  }));

  useFrame(() => {
    if (!blurRef?.current) return;
    uniforms.tIntensity.value = intensityRef?.current?.texture ?? null;
    uniforms.tBlur.value = blurRef.current.texture;
    uniforms.tPaper.value = paperRef?.current?.texture ?? null;
    render();
  }, PAINT_FRAME_ORDER);

  return null;
}
