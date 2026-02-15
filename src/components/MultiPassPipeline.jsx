import { useRef } from 'react';
import { BlinnPhongPass } from './BlinnPhongPass';
import { BlurPass } from './BlurPass';
import { CompositorPass } from './CompositorPass';

/**
 * Orchestrates the multi-pass rendering pipeline:
 * 1. BlinnPhongPass - Renders scene with Blinn-Phong lighting → FBO
 * 2. BlurPass - Renders scene with blur → FBO
 * 3. CompositorPass - Combines both FBOs → Screen
 */
export function MultiPassPipeline({
  children,
  blinnPhongWeight = 0.6,
  blurWeight = 0.4,
  blendMode = 0,
}) {
  const blinnPhongOutputRef = useRef();
  const blurOutputRef = useRef();

  return (
    <>
      <BlinnPhongPass outputRef={blinnPhongOutputRef}>
        <BlurPass outputRef={blurOutputRef}>
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
