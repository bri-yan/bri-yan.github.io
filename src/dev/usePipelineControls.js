import { useControls } from 'leva';
import * as THREE from 'three';
import {
  DEBUG_VIEWS,
  DEBUG_CHANNELS,
  DEFAULT_FLOW_PATTERN_WEIGHT,
  DEFAULT_FLOW_PATTERN_BASE_COLOR,
  DEFAULT_FLOW_PATTERN_THRESHOLD,
  DEFAULT_FLOW_PATTERN_EDGE_DARKNESS,
  DEFAULT_FLOW_PATTERN_EDGE_SHARPNESS,
  DEFAULT_FLOW_PATTERN_BASE_OPACITY,
  DEFAULT_DIFFUSE_WEIGHT,
  DEFAULT_SPECULAR_WEIGHT,
  DEFAULT_BLINN_PHONG_LIGHT_POSITION,
  DEFAULT_BLINN_PHONG_SHININESS,
  DEFAULT_BLINN_PHONG_AMBIENT_STRENGTH,
  DEFAULT_BLINN_PHONG_DIFFUSE_STRENGTH,
  DEFAULT_BLINN_PHONG_SPECULAR_STRENGTH,
  DEFAULT_BLINN_PHONG_SPECULAR_THRESHOLD,
  DEFAULT_BLUR_WEIGHT,
  DEFAULT_BLUR_STRENGTH,
  DEFAULT_BLUR_ITERATIONS,
  DEFAULT_PAPER_WEIGHT,
  DEFAULT_PAPER_REPEAT_X,
  DEFAULT_PAPER_REPEAT_Y,
  DEFAULT_COMPOSITOR_BACKGROUND,
  DEFAULT_COMPOSITOR_DIFFUSE_GAIN,
} from '../config';

const hex = (color) => `#${new THREE.Color(color).getHexString()}`;

/**
 * Dev console: leva panel exposing every pipeline tunable, initialized from
 * config/constants.js. Returns a flat object shaped like MultiPassPipeline's
 * props — spread it: <MultiPassPipeline {...usePipelineControls()}>.
 */
export function usePipelineControls() {
  const debug = useControls('Debug', {
    view: { value: 'final', options: DEBUG_VIEWS },
    channel: { value: 'rgb', options: DEBUG_CHANNELS },
  });

  const flow = useControls('Flow Pattern', {
    baseColor: hex(DEFAULT_FLOW_PATTERN_BASE_COLOR),
    threshold: { value: DEFAULT_FLOW_PATTERN_THRESHOLD, min: 0, max: 1, step: 0.01 },
    wetness: { value: 1.0 - DEFAULT_FLOW_PATTERN_THRESHOLD, min: 0, max: 1, step: 0.01 },
    edgeDarkness: { value: DEFAULT_FLOW_PATTERN_EDGE_DARKNESS, min: 0, max: 1, step: 0.01 },
    paperWeight: { value: DEFAULT_PAPER_WEIGHT, min: 0, max: 1, step: 0.01 },
    // Reserved: plumbed to the shader but not yet used by it.
    edgeSharpness: { value: DEFAULT_FLOW_PATTERN_EDGE_SHARPNESS, min: 0, max: 200, step: 1 },
    baseOpacity: { value: DEFAULT_FLOW_PATTERN_BASE_OPACITY, min: 0, max: 1, step: 0.01 },
  });

  const blur = useControls('Blur', {
    iterations: { value: DEFAULT_BLUR_ITERATIONS, min: 1, max: 10, step: 1 },
    strength: { value: DEFAULT_BLUR_STRENGTH, min: 0, max: 3, step: 0.05 },
  });

  const lighting = useControls('Lighting', {
    lightPosition: { value: DEFAULT_BLINN_PHONG_LIGHT_POSITION },
    shininess: { value: DEFAULT_BLINN_PHONG_SHININESS, min: 1, max: 128, step: 1 },
    ambientStrength: { value: DEFAULT_BLINN_PHONG_AMBIENT_STRENGTH, min: 0, max: 1, step: 0.01 },
    diffuseStrength: { value: DEFAULT_BLINN_PHONG_DIFFUSE_STRENGTH, min: 0, max: 1, step: 0.01 },
    specularStrength: { value: DEFAULT_BLINN_PHONG_SPECULAR_STRENGTH, min: 0, max: 1, step: 0.01 },
    specularThreshold: {
      value: DEFAULT_BLINN_PHONG_SPECULAR_THRESHOLD,
      min: 0,
      max: 1,
      step: 0.01,
    },
  });

  const compositor = useControls('Compositor', {
    flowPatternWeight: { value: DEFAULT_FLOW_PATTERN_WEIGHT, min: 0, max: 2, step: 0.05 },
    diffuseWeight: { value: DEFAULT_DIFFUSE_WEIGHT, min: 0, max: 2, step: 0.05 },
    specularWeight: { value: DEFAULT_SPECULAR_WEIGHT, min: 0, max: 2, step: 0.05 },
    blurWeight: { value: DEFAULT_BLUR_WEIGHT, min: 0, max: 2, step: 0.05 },
    diffuseGain: { value: DEFAULT_COMPOSITOR_DIFFUSE_GAIN, min: 0, max: 5, step: 0.05 },
    backgroundColor: hex(DEFAULT_COMPOSITOR_BACKGROUND),
  });

  const paper = useControls('Paper', {
    repeatX: { value: DEFAULT_PAPER_REPEAT_X, min: 0.25, max: 8, step: 0.25 },
    repeatY: { value: DEFAULT_PAPER_REPEAT_Y, min: 0.25, max: 8, step: 0.25 },
  });

  return {
    debugView: debug.view,
    debugChannel: debug.channel,
    flowPatternBaseColor: flow.baseColor,
    flowPatternThreshold: flow.threshold,
    flowPatternWetness: flow.wetness,
    flowPatternEdgeDarkness: flow.edgeDarkness,
    flowPatternEdgeSharpness: flow.edgeSharpness,
    flowPatternBaseOpacity: flow.baseOpacity,
    paperWeight: flow.paperWeight,
    blurIterations: blur.iterations,
    blurStrength: blur.strength,
    lightingLightPosition: lighting.lightPosition,
    lightingShininess: lighting.shininess,
    lightingAmbientStrength: lighting.ambientStrength,
    lightingDiffuseStrength: lighting.diffuseStrength,
    lightingSpecularStrength: lighting.specularStrength,
    lightingSpecularThreshold: lighting.specularThreshold,
    flowPatternWeight: compositor.flowPatternWeight,
    diffuseWeight: compositor.diffuseWeight,
    specularWeight: compositor.specularWeight,
    blurWeight: compositor.blurWeight,
    diffuseGain: compositor.diffuseGain,
    backgroundColor: compositor.backgroundColor,
    paperRepeatX: paper.repeatX,
    paperRepeatY: paper.repeatY,
  };
}
