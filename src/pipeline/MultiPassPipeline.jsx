import { useRef } from 'react';
import {
  DEFAULT_FLOW_PATTERN_WEIGHT,
  DEFAULT_BLINN_PHONG_WEIGHT,
  DEFAULT_BLUR_WEIGHT,
  DEFAULT_BLUR_STRENGTH,
  DEFAULT_BLUR_ITERATIONS,
  BLEND_MODE,
} from '../config';
import { IntensityPass } from './passes/IntensityPass';
import { FlowPatternPass } from './passes/FlowPatternPass';
import { BlinnPhongPass } from './passes/BlinnPhongPass';
import { BlurPass } from './passes/BlurPass';
import { CompositorPass } from './passes/CompositorPass';

/**
 * Multi-pass pipeline: Intensity → FlowPattern, BlinnPhong and Blur each render to an FBO;
 * CompositorPass blends them to the screen.
 */
export function MultiPassPipeline({
  children,
  flowPatternWeight = DEFAULT_FLOW_PATTERN_WEIGHT,
  blinnPhongWeight = DEFAULT_BLINN_PHONG_WEIGHT,
  blurWeight = DEFAULT_BLUR_WEIGHT,
  blurStrength = DEFAULT_BLUR_STRENGTH,
  blurIterations = DEFAULT_BLUR_ITERATIONS,
  blendMode = BLEND_MODE.ADDITIVE,
}) {
  const intensityRef = useRef();
  const flowPatternRef = useRef();
  const blinnPhongRef = useRef();
  const blurRef = useRef();

  return (
    <>
      {children}
      <IntensityPass outputRef={intensityRef} />
      <BlurPass
        inputRef={intensityRef}
        outputRef={blurRef}
        blurStrength={blurStrength}
        blurIterations={blurIterations}
      />
      <FlowPatternPass inputRef={blurRef} outputRef={flowPatternRef} />
      <BlinnPhongPass outputRef={blinnPhongRef} />
      <CompositorPass
        flowPatternRef={flowPatternRef}
        blinnPhongRef={blinnPhongRef}
        blurRef={blurRef}
        flowPatternWeight={flowPatternWeight}
        blinnPhongWeight={blinnPhongWeight}
        blurWeight={blurWeight}
        blendMode={blendMode}
      />
    </>
  );
}
