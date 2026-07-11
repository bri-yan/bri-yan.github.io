import { useFrame } from '@react-three/fiber';
import { PAINT_FRAME_ORDER } from '../../config';
import { useFullscreenPass, useUniformSync } from '../utils/passHooks';
import common from '../../shaders/chunks/common.glsl?raw';
import bodyFragment from '../../shaders/bodyFragment.frag?raw';

const fragment = `${common}\n${bodyFragment}`;

/**
 * The interior wash: the clean silhouette shape from the blurred ramp
 * (inputRef), with optional paper grain (paperRef).
 */
export function BodyPass({
  inputRef,
  paperRef,
  outputRef,
  baseColor,
  threshold,
  wetness,
  paperWeight,
  opacity, // reserved — not yet used by the shader
}) {
  const { target, uniforms, render } = useFullscreenPass(fragment, () => ({
    tIntensity: { value: null },
    tPaper: { value: null },
    uBaseColor: { value: baseColor },
    uThreshold: { value: threshold },
    uWetness: { value: wetness },
    uPaperWeight: { value: paperWeight },
    uBaseOpacity: { value: opacity },
  }));

  if (outputRef) outputRef.current = target;

  useUniformSync(uniforms, () => ({
    uBaseColor: baseColor,
    uThreshold: threshold,
    uWetness: wetness,
    uPaperWeight: paperWeight,
    uBaseOpacity: opacity,
  }));

  useFrame(() => {
    if (!inputRef?.current) return;
    uniforms.tIntensity.value = inputRef.current.texture;
    uniforms.tPaper.value = paperRef?.current?.texture ?? null;
    render();
  }, PAINT_FRAME_ORDER);

  return null;
}
