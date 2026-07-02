import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { PASS_FRAME_ORDER, UNIFORM_SYNC_FRAME_ORDER } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import paperTextureFragment from '../../shaders/paperTextureFragment.frag?raw';

/**
 * Loads the paper texture and outputs it at pipeline resolution:
 * rgb = paper color, alpha = normalized brightness (ridge/valley grain).
 */
export function PaperTexturePass({ outputRef, repeatX = 1, repeatY = 1 }) {
  const paperTexture = useTexture('/textures/paper.jpg', (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
  });

  const { target, uniforms, render } = useFullscreenPass(paperTextureFragment, () => ({
    tPaper: { value: null },
    uRepeat: { value: new THREE.Vector2(repeatX, repeatY) },
  }));

  if (outputRef) outputRef.current = target;

  useFrame(() => {
    uniforms.uRepeat.value.set(repeatX, repeatY);
  }, UNIFORM_SYNC_FRAME_ORDER);

  useFrame(() => {
    uniforms.tPaper.value = paperTexture;
    render();
  }, PASS_FRAME_ORDER);

  return null;
}
