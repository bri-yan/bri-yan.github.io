import { useFrame } from '@react-three/fiber';
import { EDGE_DARKENING_PASS_FRAME_ORDER } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import oklabChunk from '../../shaders/chunks/oklab.glsl?raw';
import edgeDarkeningFragment from '../../shaders/edgeDarkeningFragment.frag?raw';

const fragmentShader = `${oklabChunk}\n${edgeDarkeningFragment}`;

/** Concentrates the paint along blurred sobel edges: the same hue, darker and richer (OKLab), with thicker density. */
export function EdgeDarkeningPass({ paintRef, edgesRef, outputRef, strength }) {
  const { target, uniforms, render } = useFullscreenPass(fragmentShader, () => ({
    tPaint: { value: null },
    tEdges: { value: null },
    uStrength: { value: 0 },
  }));

  if (outputRef) outputRef.current = target;

  useFrame(() => {
    const paint = paintRef.current;
    const edges = edgesRef.current;
    if (!paint || !edges) return;
    uniforms.tPaint.value = paint.texture;
    uniforms.tEdges.value = edges.texture;
    uniforms.uStrength.value = strength;
    render();
  }, EDGE_DARKENING_PASS_FRAME_ORDER);

  return null;
}
