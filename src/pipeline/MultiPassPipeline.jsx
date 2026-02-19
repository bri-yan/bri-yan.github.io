import { useRef } from 'react';
import {
  DEFAULT_RAW_WEIGHT,
  DEFAULT_BLINN_PHONG_WEIGHT,
  DEFAULT_BLUR_WEIGHT,
  DEFAULT_BLUR_STRENGTH,
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
  rawWeight = DEFAULT_RAW_WEIGHT,
  blinnPhongWeight = DEFAULT_BLINN_PHONG_WEIGHT,
  blurWeight = DEFAULT_BLUR_WEIGHT,
  blurStrength = DEFAULT_BLUR_STRENGTH,
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
      <BlurPass inputRef={intensityRef} outputRef={blurRef} blurStrength={blurStrength} />
      <FlowPatternPass inputRef={blurRef} outputRef={flowPatternRef} />
      <BlinnPhongPass outputRef={blinnPhongRef} />
      <CompositorPass
        rawRef={flowPatternRef}
        blinnPhongRef={blinnPhongRef}
        blurRef={blurRef}
        rawWeight={rawWeight}
        blinnPhongWeight={blinnPhongWeight}
        blurWeight={blurWeight}
        blendMode={blendMode}
      />
    </>
  );
}
