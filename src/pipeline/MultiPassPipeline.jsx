import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  DEFAULT_FLOW_PATTERN_WEIGHT,
  DEFAULT_FLOW_PATTERN_BASE_COLOR,
  DEFAULT_FLOW_PATTERN_THRESHOLD,
  DEFAULT_FLOW_PATTERN_EDGE_DARKNESS,
  DEFAULT_FLOW_PATTERN_EDGE_SHARPNESS,
  DEFAULT_FLOW_PATTERN_BASE_OPACITY,
  DEFAULT_LIGHTING_WEIGHT,
  DEFAULT_BLINN_PHONG_LIGHT_POSITION,
  DEFAULT_BLINN_PHONG_SHININESS,
  DEFAULT_BLINN_PHONG_AMBIENT_STRENGTH,
  DEFAULT_BLINN_PHONG_DIFFUSE_STRENGTH,
  DEFAULT_BLINN_PHONG_SPECULAR_STRENGTH,
  DEFAULT_BLUR_WEIGHT,
  DEFAULT_BLUR_STRENGTH,
  DEFAULT_BLUR_ITERATIONS,
  DEFAULT_PAPER_WEIGHT,
  DEFAULT_PAPER_REPEAT_X,
  DEFAULT_PAPER_REPEAT_Y,
  DEFAULT_COMPOSITOR_BACKGROUND,
  BLEND_MODE,
} from '../config';
import { IntensityPass } from './passes/IntensityPass';
import { FlowPatternPass } from './passes/FlowPatternPass';
import { DiffusePass } from './passes/DiffusePass';
import { SpecularPass } from './passes/SpecularPass';
import { BlurPass } from './passes/BlurPass';
import { CompositorPass } from './passes/CompositorPass';
import { PaperTexturePass } from './passes/PaperTexturePass';

/**
 * Multi-pass pipeline: Intensity → FlowPattern, Diffuse + Specular and Blur each render to FBOs;
 * CompositorPass combines lighting (diffuse+specular) and blends all to the screen.
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
  lightingWeight = DEFAULT_LIGHTING_WEIGHT,
  lightingLightPosition = DEFAULT_BLINN_PHONG_LIGHT_POSITION,
  lightingShininess = DEFAULT_BLINN_PHONG_SHININESS,
  lightingAmbientStrength = DEFAULT_BLINN_PHONG_AMBIENT_STRENGTH,
  lightingDiffuseStrength = DEFAULT_BLINN_PHONG_DIFFUSE_STRENGTH,
  lightingSpecularStrength = DEFAULT_BLINN_PHONG_SPECULAR_STRENGTH,
  blurWeight = DEFAULT_BLUR_WEIGHT,
  blurStrength = DEFAULT_BLUR_STRENGTH,
  blurIterations = DEFAULT_BLUR_ITERATIONS,
  paperWeight = DEFAULT_PAPER_WEIGHT,
  paperRepeatX = DEFAULT_PAPER_REPEAT_X,
  paperRepeatY = DEFAULT_PAPER_REPEAT_Y,
  backgroundColor = DEFAULT_COMPOSITOR_BACKGROUND,
  showPaper = false,
  blendMode = BLEND_MODE.ADDITIVE,
}) {
  const baseColor = useMemo(
    () =>
      typeof flowPatternBaseColor === 'number'
        ? new THREE.Color(flowPatternBaseColor)
        : flowPatternBaseColor,
    [flowPatternBaseColor]
  );
  const bgColor = useMemo(
    () =>
      typeof backgroundColor === 'number'
        ? new THREE.Color(backgroundColor)
        : backgroundColor,
    [backgroundColor]
  );
  const intensityRef = useRef();
  const flowPatternRef = useRef();
  const diffuseRef = useRef();
  const specularRef = useRef();
  const blurRef = useRef();
  const paperRef = useRef();

  return (
    <>
      {children}
      <PaperTexturePass outputRef={paperRef} repeatX={paperRepeatX} repeatY={paperRepeatY} />
      <IntensityPass outputRef={intensityRef} />
      <BlurPass
        inputRef={intensityRef}
        outputRef={blurRef}
        blurStrength={blurStrength}
        blurIterations={blurIterations}
      />
      <FlowPatternPass
        inputRef={blurRef}
        paperRef={paperRef}
        outputRef={flowPatternRef}
        baseColor={baseColor}
        threshold={flowPatternThreshold}
        paperWeight={paperWeight}
        wetness={flowPatternWetness}
        edgeDarkness={flowPatternEdgeDarkness}
        edgeSharpness={flowPatternEdgeSharpness}
        baseOpacity={flowPatternBaseOpacity}
      />
      <DiffusePass
        outputRef={diffuseRef}
        lightPosition={lightingLightPosition}
        ambientStrength={lightingAmbientStrength}
        diffuseStrength={lightingDiffuseStrength}
      />
      <SpecularPass
        outputRef={specularRef}
        lightPosition={lightingLightPosition}
        shininess={lightingShininess}
        specularStrength={lightingSpecularStrength}
      />
      <CompositorPass
        flowPatternRef={flowPatternRef}
        diffuseRef={diffuseRef}
        specularRef={specularRef}
        blurRef={blurRef}
        paperRef={paperRef}
        flowPatternWeight={flowPatternWeight}
        lightingWeight={lightingWeight}
        blurWeight={blurWeight}
        paperWeight={paperWeight}
        backgroundColor={bgColor}
        showPaper={showPaper}
        blendMode={blendMode}
      />
    </>
  );
}
