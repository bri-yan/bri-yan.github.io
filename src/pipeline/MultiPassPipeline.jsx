import { useMemo, createRef } from 'react';
import * as THREE from 'three';
import {
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
import { IntensityPass } from './passes/IntensityPass';
import { FlowPatternPass } from './passes/FlowPatternPass';
import { DiffusePass } from './passes/DiffusePass';
import { SpecularPass } from './passes/SpecularPass';
import { BlurPass } from './passes/BlurPass';
import { CompositorPass } from './passes/CompositorPass';
import { PaperTexturePass } from './passes/PaperTexturePass';
import { DebugViewPass } from './passes/DebugViewPass';

const toColor = (value) => (value?.isColor ? value : new THREE.Color(value));

/**
 * Multi-pass watercolor pipeline. Passes are flat siblings that write to
 * per-pass FBOs (the `fbos` map) and are ordered by useFrame priority;
 * CompositorPass blends them to the screen. Set `debugView` to any fbos key
 * to inspect that pass's raw output instead of the composite.
 */
export function MultiPassPipeline({
  children,
  flowPatternWeight = DEFAULT_FLOW_PATTERN_WEIGHT,
  flowPatternBaseColor = DEFAULT_FLOW_PATTERN_BASE_COLOR,
  flowPatternThreshold = DEFAULT_FLOW_PATTERN_THRESHOLD,
  flowPatternWetness = 1.0 - DEFAULT_FLOW_PATTERN_THRESHOLD,
  flowPatternEdgeDarkness = DEFAULT_FLOW_PATTERN_EDGE_DARKNESS,
  flowPatternEdgeSharpness = DEFAULT_FLOW_PATTERN_EDGE_SHARPNESS,
  flowPatternBaseOpacity = DEFAULT_FLOW_PATTERN_BASE_OPACITY,
  diffuseWeight = DEFAULT_DIFFUSE_WEIGHT,
  specularWeight = DEFAULT_SPECULAR_WEIGHT,
  lightingLightPosition = DEFAULT_BLINN_PHONG_LIGHT_POSITION,
  lightingShininess = DEFAULT_BLINN_PHONG_SHININESS,
  lightingAmbientStrength = DEFAULT_BLINN_PHONG_AMBIENT_STRENGTH,
  lightingDiffuseStrength = DEFAULT_BLINN_PHONG_DIFFUSE_STRENGTH,
  lightingSpecularStrength = DEFAULT_BLINN_PHONG_SPECULAR_STRENGTH,
  lightingSpecularThreshold = DEFAULT_BLINN_PHONG_SPECULAR_THRESHOLD,
  blurWeight = DEFAULT_BLUR_WEIGHT,
  blurStrength = DEFAULT_BLUR_STRENGTH,
  blurIterations = DEFAULT_BLUR_ITERATIONS,
  paperWeight = DEFAULT_PAPER_WEIGHT,
  paperRepeatX = DEFAULT_PAPER_REPEAT_X,
  paperRepeatY = DEFAULT_PAPER_REPEAT_Y,
  backgroundColor = DEFAULT_COMPOSITOR_BACKGROUND,
  diffuseGain = DEFAULT_COMPOSITOR_DIFFUSE_GAIN,
  debugView = 'final',
  debugChannel = 'rgb',
}) {
  const baseColor = useMemo(() => toColor(flowPatternBaseColor), [flowPatternBaseColor]);
  const bgColor = useMemo(() => toColor(backgroundColor), [backgroundColor]);

  // One FBO ref per pass; keys double as the debug-view names (DEBUG_VIEWS).
  const fbos = useMemo(
    () => ({
      paper: createRef(),
      intensity: createRef(),
      blur: createRef(),
      flowPattern: createRef(),
      diffuse: createRef(),
      diffuseBlur: createRef(),
      specular: createRef(),
    }),
    []
  );

  return (
    <>
      {children}
      <PaperTexturePass outputRef={fbos.paper} repeatX={paperRepeatX} repeatY={paperRepeatY} />
      <IntensityPass outputRef={fbos.intensity} />
      <BlurPass
        inputRef={fbos.intensity}
        outputRef={fbos.blur}
        blurStrength={blurStrength}
        blurIterations={blurIterations}
      />
      <FlowPatternPass
        inputRef={fbos.blur}
        paperRef={fbos.paper}
        outputRef={fbos.flowPattern}
        baseColor={baseColor}
        threshold={flowPatternThreshold}
        paperWeight={paperWeight}
        wetness={flowPatternWetness}
        edgeDarkness={flowPatternEdgeDarkness}
        edgeSharpness={flowPatternEdgeSharpness}
        baseOpacity={flowPatternBaseOpacity}
      />
      <DiffusePass
        outputRef={fbos.diffuse}
        lightPosition={lightingLightPosition}
        ambientStrength={lightingAmbientStrength}
        diffuseStrength={lightingDiffuseStrength}
        baseColor={baseColor}
      />
      <BlurPass
        inputRef={fbos.diffuse}
        outputRef={fbos.diffuseBlur}
        blurStrength={blurStrength}
        blurIterations={blurIterations}
      />
      <SpecularPass
        outputRef={fbos.specular}
        lightPosition={lightingLightPosition}
        shininess={lightingShininess}
        specularStrength={lightingSpecularStrength}
        specularThreshold={lightingSpecularThreshold}
      />
      <CompositorPass
        flowPatternRef={fbos.flowPattern}
        diffuseRef={fbos.diffuseBlur}
        specularRef={fbos.specular}
        blurRef={fbos.blur}
        flowPatternWeight={flowPatternWeight}
        diffuseWeight={diffuseWeight}
        specularWeight={specularWeight}
        blurWeight={blurWeight}
        diffuseGain={diffuseGain}
        backgroundColor={bgColor}
      />
      <DebugViewPass passes={fbos} view={debugView} channel={debugChannel} />
    </>
  );
}
