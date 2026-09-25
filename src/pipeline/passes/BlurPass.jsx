import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BLUR_FBO_OPTIONS, BLUR_MAX_TAPS, BLUR_PASS_FRAME_ORDER } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import gaussianBlurFragment from '../../shaders/gaussianBlurFragment.frag?raw';

const blurUniforms = () => ({
  tInput: { value: null },
  uStep: { value: new THREE.Vector2() },
  uSigma: { value: 1 },
  uTaps: { value: 0 },
  uPremultiplyInput: { value: false },
  uUnpremultiplyOutput: { value: false },
});

/** Sizes a Gaussian so `radius` CSS pixels spans ~3σ, with at most BLUR_MAX_TAPS taps per side. */
function blurKernel(radius, pixelRatio) {
  const radiusPx = Math.max(0, radius) * pixelRatio;
  const taps = Math.min(Math.ceil(radiusPx), BLUR_MAX_TAPS);
  const tapSpacingPx = taps > 0 ? radiusPx / taps : 1;
  return { taps, tapSpacingPx, sigma: Math.max(radiusPx / 3 / tapSpacingPx, 0.001) };
}

/**
 * Reusable separable Gaussian blur of any RGBA pass. Color is blurred
 * premultiplied by alpha, so coverage stays meaningful and empty pixels'
 * RGB never bleeds in. Each iteration is a horizontal pass into a private
 * target and a vertical pass into the output; data stays premultiplied
 * between iterations and is un-premultiplied only on the final write.
 */
export function BlurPass({ inputRef, outputRef, radius, iterations = 1 }) {
  const horizontal = useFullscreenPass(gaussianBlurFragment, blurUniforms, {
    fboOptions: BLUR_FBO_OPTIONS,
  });
  const vertical = useFullscreenPass(gaussianBlurFragment, blurUniforms, {
    fboOptions: BLUR_FBO_OPTIONS,
  });

  if (outputRef) outputRef.current = vertical.target;

  useFrame(({ gl }) => {
    const input = inputRef.current;
    if (!input) return;

    const { taps, tapSpacingPx, sigma } = blurKernel(radius, gl.getPixelRatio());
    const passCount = Math.max(1, Math.floor(iterations));
    for (const pass of [horizontal, vertical]) {
      pass.uniforms.uTaps.value = taps;
      pass.uniforms.uSigma.value = sigma;
    }
    horizontal.uniforms.uStep.value.set(tapSpacingPx / input.width, 0);
    vertical.uniforms.uStep.value.set(0, tapSpacingPx / input.height);

    for (let i = 0; i < passCount; i++) {
      horizontal.uniforms.tInput.value = i === 0 ? input.texture : vertical.target.texture;
      horizontal.uniforms.uPremultiplyInput.value = i === 0;
      horizontal.render();

      vertical.uniforms.tInput.value = horizontal.target.texture;
      vertical.uniforms.uUnpremultiplyOutput.value = i === passCount - 1;
      vertical.render();
    }
  }, BLUR_PASS_FRAME_ORDER);

  return null;
}
