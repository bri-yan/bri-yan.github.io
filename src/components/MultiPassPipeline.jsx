import { useRef } from 'react';
import {
  DEFAULT_RAW_WEIGHT,
  DEFAULT_BLINN_PHONG_WEIGHT,
  DEFAULT_BLUR_WEIGHT,
  DEFAULT_BLUR_STRENGTH,
  BLEND_MODE,
} from '../constants';
import { RawPass } from './RawPass';
import { BlinnPhongPass } from './BlinnPhongPass';
import { BlurPass } from './BlurPass';
import { CompositorPass } from './CompositorPass';

/**
 * Multi-pass pipeline: Raw, BlinnPhong and Blur each render to an FBO;
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
  const rawRef = useRef();
  const blinnPhongRef = useRef();
  const blurRef = useRef();

  return (
    <>
      {children}
      <RawPass outputRef={rawRef} />
      <BlinnPhongPass outputRef={blinnPhongRef} />
      <BlurPass outputRef={blurRef} blurStrength={blurStrength} />
      <CompositorPass
        rawRef={rawRef}
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
