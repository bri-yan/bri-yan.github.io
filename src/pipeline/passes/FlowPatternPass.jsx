import { useFrame } from '@react-three/fiber';
import { FLOW_PATTERN_FRAME_ORDER } from '../../config';
import { useFullscreenPass, useUniformSync } from '../utils/passHooks';
import flowPatternFragment from '../../shaders/flowPatternFragment.frag?raw';

/**
 * The watercolor shader: carves a wet-edged, granulated shape out of the
 * blurred intensity ramp (inputRef), perturbed by paper grain (paperRef).
 */
export function FlowPatternPass({
  inputRef,
  paperRef,
  outputRef,
  baseColor,
  threshold,
  paperWeight,
  wetness,
  edgeDarkness,
  edgeSharpness, // reserved — not yet used by the shader
  baseOpacity, // reserved — not yet used by the shader
}) {
  const { target, uniforms, render } = useFullscreenPass(flowPatternFragment, () => ({
    tIntensity: { value: null },
    tPaper: { value: null },
    uBaseColor: { value: baseColor },
    uBaseOpacity: { value: baseOpacity },
    uThreshold: { value: threshold },
    uPaperWeight: { value: paperWeight },
    uWetness: { value: wetness },
    uEdgeDarkness: { value: edgeDarkness },
    uEdgeSharpness: { value: edgeSharpness },
  }));

  if (outputRef) outputRef.current = target;

  useUniformSync(uniforms, () => ({
    uBaseColor: baseColor,
    uBaseOpacity: baseOpacity,
    uThreshold: threshold,
    uPaperWeight: paperWeight,
    uWetness: wetness,
    uEdgeDarkness: edgeDarkness,
    uEdgeSharpness: edgeSharpness,
  }));

  useFrame(() => {
    if (!inputRef?.current) return;
    uniforms.tIntensity.value = inputRef.current.texture;
    uniforms.tPaper.value = paperRef?.current?.texture ?? null;
    render();
  }, FLOW_PATTERN_FRAME_ORDER);

  return null;
}
