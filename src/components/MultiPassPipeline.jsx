import { useRef } from 'react';
import {
  DEFAULT_BLINN_PHONG_WEIGHT,
  DEFAULT_BLUR_WEIGHT,
  DEFAULT_BLUR_STRENGTH,
  BLEND_MODE,
} from '../constants';
import { BlinnPhongPass } from './BlinnPhongPass';
import { BlurPass } from './BlurPass';
import { CompositorPass } from './CompositorPass';

/**
 * Pipeline: BlinnPhongPass → FBO, BlurPass → FBO, CompositorPass → screen.
 */
export function MultiPassPipeline({
  children,
  blinnPhongWeight = DEFAULT_BLINN_PHONG_WEIGHT,
  blurWeight = DEFAULT_BLUR_WEIGHT,
  blurStrength = DEFAULT_BLUR_STRENGTH,
  blendMode = BLEND_MODE.ADDITIVE,
}) {
  const blinnPhongOutputRef = useRef();
  const blurOutputRef = useRef();

  return (
    <>
      <BlinnPhongPass outputRef={blinnPhongOutputRef}>
        <BlurPass outputRef={blurOutputRef} blurStrength={blurStrength}>
          {children}
        </BlurPass>
      </BlinnPhongPass>

      <CompositorPass
        blinnPhongRef={blinnPhongOutputRef}
        blurRef={blurOutputRef}
        blinnPhongWeight={blinnPhongWeight}
        blurWeight={blurWeight}
        blendMode={blendMode}
      />
    </>
  );
}
