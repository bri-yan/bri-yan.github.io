import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  DEFAULT_FLOW_PATTERN_WEIGHT,
  DEFAULT_FLOW_PATTERN_BASE_COLOR,
  DEFAULT_FLOW_PATTERN_THRESHOLD,
  DEFAULT_FLOW_PATTERN_EDGE_DARKNESS,
  DEFAULT_FLOW_PATTERN_BASE_OPACITY,
  DEFAULT_BLINN_PHONG_WEIGHT,
  DEFAULT_BLUR_WEIGHT,
  DEFAULT_BLUR_STRENGTH,
  DEFAULT_BLUR_ITERATIONS,
  DEFAULT_PAPER_WEIGHT,
  DEFAULT_PAPER_REPEAT_X,
  DEFAULT_PAPER_REPEAT_Y,
  BLEND_MODE,
} from '../config';
import { IntensityPass } from './passes/IntensityPass';
import { FlowPatternPass } from './passes/FlowPatternPass';
import { BlinnPhongPass } from './passes/BlinnPhongPass';
import { BlurPass } from './passes/BlurPass';
import { CompositorPass } from './passes/CompositorPass';
import { PaperTexturePass } from './passes/PaperTexturePass';

/**
 * Multi-pass pipeline: Intensity → FlowPattern, BlinnPhong and Blur each render to an FBO;
 * CompositorPass blends them to the screen.
 */
export function MultiPassPipeline({
  children,
  flowPatternWeight = DEFAULT_FLOW_PATTERN_WEIGHT,
  flowPatternBaseColor = DEFAULT_FLOW_PATTERN_BASE_COLOR,
  flowPatternThreshold = DEFAULT_FLOW_PATTERN_THRESHOLD,
  flowPatternWetness = 1.0 - DEFAULT_FLOW_PATTERN_THRESHOLD,
  flowPatternEdgeDarkness = DEFAULT_FLOW_PATTERN_EDGE_DARKNESS,
  flowPatternBaseOpacity = DEFAULT_FLOW_PATTERN_BASE_OPACITY,
  blinnPhongWeight = DEFAULT_BLINN_PHONG_WEIGHT,
  blurWeight = DEFAULT_BLUR_WEIGHT,
  blurStrength = DEFAULT_BLUR_STRENGTH,
  blurIterations = DEFAULT_BLUR_ITERATIONS,
  paperWeight = DEFAULT_PAPER_WEIGHT,
  paperRepeatX = DEFAULT_PAPER_REPEAT_X,
  paperRepeatY = DEFAULT_PAPER_REPEAT_Y,
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
  const intensityRef = useRef();
  const flowPatternRef = useRef();
  const blinnPhongRef = useRef();
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
        wetness={flowPatternWetness}
        edgeDarkness={flowPatternEdgeDarkness}
        baseOpacity={flowPatternBaseOpacity}
      />
      <BlinnPhongPass outputRef={blinnPhongRef} />
      <CompositorPass
        flowPatternRef={flowPatternRef}
        blinnPhongRef={blinnPhongRef}
        blurRef={blurRef}
        paperRef={paperRef}
        flowPatternWeight={flowPatternWeight}
        blinnPhongWeight={blinnPhongWeight}
        blurWeight={blurWeight}
        paperWeight={paperWeight}
        showPaper={showPaper}
        blendMode={blendMode}
      />
    </>
  );
}
