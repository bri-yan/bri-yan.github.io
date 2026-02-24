import {
  DIFFUSE_BLUR_FRAME_ORDER,
  DEFAULT_BLUR_STRENGTH,
  DEFAULT_BLUR_ITERATIONS,
} from '../../config';
import { useGaussianBlur } from '../utils/useGaussianBlur';

/** Blurs the diffuse pass output. Separate from BlurPass to avoid shared FBO/state. */
export function DiffuseBlurPass({
  inputRef,
  outputRef,
  blurStrength = DEFAULT_BLUR_STRENGTH,
  blurIterations = DEFAULT_BLUR_ITERATIONS,
}) {
  useGaussianBlur(
    inputRef,
    outputRef,
    blurStrength,
    blurIterations,
    DIFFUSE_BLUR_FRAME_ORDER
  );
  return null;
}
