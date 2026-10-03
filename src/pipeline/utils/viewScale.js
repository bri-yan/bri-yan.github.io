import { useEffect, useState } from 'react';
import { RENDER_MAX_SHORT_SIDE, STAGE_REFERENCE_SIZE } from '../../config';

/**
 * Device pixels per stage pixel: the unit every CSS-pixel length in the
 * pipeline is measured in. Proportional to the canvas's short side, so effects
 * keep their size relative to the subject at any window size.
 */
export function pixelsPerStageUnit({ gl, size }) {
  return (gl.getPixelRatio() * Math.max(1, Math.min(size.width, size.height))) / STAGE_REFERENCE_SIZE;
}

const renderDpr = () =>
  Math.min(
    window.devicePixelRatio || 1,
    RENDER_MAX_SHORT_SIDE / Math.max(1, Math.min(window.innerWidth, window.innerHeight))
  );

/**
 * The canvas density: the device's own, but low enough that the short side
 * never renders more than RENDER_MAX_SHORT_SIDE pixels. The browser scales
 * the result to fill the window.
 */
export function useRenderDpr() {
  const [dpr, setDpr] = useState(renderDpr);

  useEffect(() => {
    const onResize = () => setDpr(renderDpr());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return dpr;
}
