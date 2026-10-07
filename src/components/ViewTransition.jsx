import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { VIEW_TRANSITION_SECONDS } from '../config';
import { useRepaint } from '../pipeline/PaintingFrame';
import { useTransition } from '../pipeline/Transition';

const MAX_STEP = 1 / 30; // after an idle spell the frame delta spans it
const smooth = (x) => x * x * (3 - 2 * x);

/**
 * Switches views through bare paper: while the wanted view differs from the
 * shown one, the shown painting is unpainted; once it is bare, `onSwap` shows
 * the wanted view, which is then painted in. Wanting the shown view again
 * mid-way simply reverses. Drives `useTransition().progress`.
 */
export function ViewTransition({ target, shown, onSwap }) {
  const transition = useTransition();
  const repaint = useRepaint();
  const elapsed = useRef(0); // 0 painted … 1 bare, linear in time

  // Before PaintingFrameProvider's check (−0.5), so the same frame repaints.
  useFrame((_, delta) => {
    const unpainting = target.id !== shown.id;
    if (unpainting && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onSwap(target);
      return;
    }
    const previous = elapsed.current;
    const step = Math.min(delta, MAX_STEP) / VIEW_TRANSITION_SECONDS;
    elapsed.current = unpainting ? Math.min(1, previous + step) : Math.max(0, previous - step);
    if (elapsed.current !== previous) {
      transition.progress = smooth(elapsed.current);
      repaint();
    }
    if (unpainting && elapsed.current === 1) onSwap(target);
  }, -0.75);

  return null;
}
