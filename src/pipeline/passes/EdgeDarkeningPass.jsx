import * as THREE from 'three';
import { BLUR_MAX_TAPS, BLUR_TARGET_OPTIONS, EDGE_DARKENING_PASS_FRAME_ORDER } from '../../config';
import { usePaintFrame } from '../PaintingFrame';
import { useFullscreenPass } from '../utils/passHooks';
import { pixelsPerStageUnit } from '../utils/viewScale';
import blurChunk from '../../shaders/chunks/blur.glsl?raw';
import oklabChunk from '../../shaders/chunks/oklab.glsl?raw';
import blurHorizontalFragment from '../../shaders/blurHorizontalFragment.frag?raw';
import edgeDarkeningFragment from '../../shaders/edgeDarkeningFragment.frag?raw';

const horizontalShader = `${blurChunk}\n${blurHorizontalFragment}`;
const verticalShader = `${oklabChunk}\n${blurChunk}\n${edgeDarkeningFragment}`;
const MAX_PAIRS = BLUR_MAX_TAPS / 2;

/** Sizes a Gaussian so `radius` stage pixels spans ~3σ, with at most BLUR_MAX_TAPS taps per side. */
function blurKernel(radius, pixelsPerUnit) {
  const radiusPx = Math.max(0, radius) * pixelsPerUnit;
  const taps = Math.min(Math.ceil(radiusPx), BLUR_MAX_TAPS);
  const tapSpacingPx = taps > 0 ? radiusPx / taps : 1;
  return { taps, tapSpacingPx, sigma: Math.max(radiusPx / 3 / tapSpacingPx, 0.001) };
}

/**
 * Writes the normalized kernel into a pass's uniforms (`<name>Center`,
 * `<name>Pairs`, `<name>PairCount`): the center weight, then neighboring taps
 * merged in pairs, each pair one bilinear fetch at their weighted mean
 * offset, so a blur costs about half the texture reads. 0 radius passes the
 * input through.
 */
function setKernel(uniforms, name, radius, pixelsPerUnit) {
  const { taps, tapSpacingPx, sigma } = blurKernel(radius, pixelsPerUnit);
  const weight = (i) => Math.exp((-0.5 * i * i) / (sigma * sigma));
  let total = 1;
  for (let i = 1; i <= taps; i++) total += 2 * weight(i);

  const pairs = uniforms[`${name}Pairs`].value;
  let count = 0;
  for (let i = 1; i <= taps; i += 2) {
    const a = weight(i);
    const b = i < taps ? weight(i + 1) : 0;
    pairs[count++].set((tapSpacingPx * (a * i + b * (i + 1))) / (a + b), (a + b) / total);
  }
  uniforms[`${name}Center`].value = 1 / total;
  uniforms[`${name}PairCount`].value = count;
}

const blurUniforms = () => ({
  tPaint: { value: null },
  tEdges: { value: null },
  uTexelSize: { value: new THREE.Vector2() },
  uPaintCenter: { value: 1 },
  uPaintPairs: { value: Array.from({ length: MAX_PAIRS }, () => new THREE.Vector2()) },
  uPaintPairCount: { value: 0 },
  uEdgesCenter: { value: 1 },
  uEdgesPairs: { value: Array.from({ length: MAX_PAIRS }, () => new THREE.Vector2()) },
  uEdgesPairCount: { value: 0 },
});

/**
 * The paint layer: the watercolor layer blurred by the wetness radius, then
 * concentrated along the depth edges blurred by the edge width. Both separable
 * Gaussian blurs share their two passes. The horizontal pass writes both
 * signals at once (MRT); the vertical pass finishes them and applies edge
 * darkening, the same hue darker and richer (OKLab) with thicker density.
 * Color is blurred premultiplied by alpha, so empty pixels never bleed in.
 */
export function EdgeDarkeningPass({
  paintRef,
  edgesRef,
  outputRef,
  paintBlurRadius,
  edgeBlurRadius,
  strength,
}) {
  const horizontal = useFullscreenPass(horizontalShader, blurUniforms, {
    fboOptions: BLUR_TARGET_OPTIONS,
    glslVersion: THREE.GLSL3,
  });
  const vertical = useFullscreenPass(verticalShader, () => ({
    ...blurUniforms(),
    uStrength: { value: 0 },
  }));

  if (outputRef) outputRef.current = vertical.target;

  usePaintFrame((state) => {
    const paint = paintRef.current;
    const edges = edgesRef.current;
    if (!paint || !edges) return;

    const pixelsPerUnit = pixelsPerStageUnit(state);
    for (const { uniforms } of [horizontal, vertical]) {
      uniforms.uTexelSize.value.set(1 / paint.width, 1 / paint.height);
      setKernel(uniforms, 'uPaint', paintBlurRadius, pixelsPerUnit);
      setKernel(uniforms, 'uEdges', edgeBlurRadius, pixelsPerUnit);
    }

    horizontal.uniforms.tPaint.value = paint.textures[0];
    horizontal.uniforms.tEdges.value = edges.texture;
    horizontal.render();

    vertical.uniforms.tPaint.value = horizontal.target.textures[0];
    vertical.uniforms.tEdges.value = horizontal.target.textures[1];
    vertical.uniforms.uStrength.value = strength;
    vertical.render();
  }, EDGE_DARKENING_PASS_FRAME_ORDER);

  return null;
}
