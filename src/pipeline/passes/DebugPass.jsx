import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DEBUG_VIEW_FRAME_ORDER, DEBUG_CHANNELS } from '../../config';
import { useFullscreenPass } from '../utils/passHooks';
import { useWatercolorSubjects } from '../WatercolorSubjects';
import debugFragment from '../../shaders/debugFragment.frag?raw';

const BOUNDS_COLOR = 0xffa000;

function useNormalizedDepthBoundsOverlay() {
  const subjects = useWatercolorSubjects();
  const overlay = useMemo(() => {
    const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    const material = new THREE.LineBasicMaterial({ color: BOUNDS_COLOR, depthTest: false, depthWrite: false });

    return {
      scene: new THREE.Scene(),
      geometry,
      material,
      lines: new Map(),
      center: new THREE.Vector3(),
      size: new THREE.Vector3(),
      boxMatrix: new THREE.Matrix4(),
      identity: new THREE.Quaternion(),
    };
  }, []);

  useEffect(
    () => () => {
      overlay.geometry.dispose();
      overlay.material.dispose();
    },
    [overlay]
  );

  return (gl, camera) => {
    const visibleMeshes = new Set();
    subjects.forEach(({ ref }) => {
      const object = ref.current;
      if (!object) return;
      object.updateWorldMatrix(true, true);
      object.traverse((mesh) => {
        if (!mesh.isMesh || !mesh.geometry) return;
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        const bounds = mesh.geometry.boundingBox;
        if (!bounds) return;

        let line = overlay.lines.get(mesh);
        if (!line) {
          line = new THREE.LineSegments(overlay.geometry, overlay.material);
          line.matrixAutoUpdate = false;
          overlay.lines.set(mesh, line);
          overlay.scene.add(line);
        }

        bounds.getCenter(overlay.center);
        bounds.getSize(overlay.size);
        overlay.boxMatrix.compose(overlay.center, overlay.identity, overlay.size);
        line.matrix.copy(mesh.matrixWorld).multiply(overlay.boxMatrix);
        line.matrixWorldNeedsUpdate = true;
        visibleMeshes.add(mesh);
      });
    });

    overlay.lines.forEach((line, mesh) => {
      if (visibleMeshes.has(mesh)) return;
      overlay.scene.remove(line);
      overlay.lines.delete(mesh);
    });

    const previousTarget = gl.getRenderTarget();
    const previousAutoClear = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(null);
    gl.render(overlay.scene, camera);
    gl.setRenderTarget(previousTarget);
    gl.autoClear = previousAutoClear;
  };
}

/**
 * Dev tool: draws a single pass's FBO to the screen, replacing the compositor
 * output. `passes` maps view names to FBO refs; when `view` has no entry
 * (e.g. 'output') the pass does nothing and the normal output stands.
 */
export function DebugPass({ passes, view = 'output', channel = 'rgb', showBoundingBoxes = false }) {
  const renderBounds = useNormalizedDepthBoundsOverlay();
  const { uniforms, render } = useFullscreenPass(
    debugFragment,
    () => ({
      tInput: { value: null },
      uChannel: { value: 0 },
      uMode: { value: 0 },
      uNear: { value: 0.1 },
      uFar: { value: 1000 },
    }),
    { offscreen: false }
  );

  useFrame(({ gl, camera }) => {
    const source = passes[view];
    if (!source?.current) return;
    uniforms.tInput.value = source.current.texture;
    uniforms.uChannel.value = Math.max(0, DEBUG_CHANNELS.indexOf(channel));
    uniforms.uMode.value = view === 'raw-depth' ? 1 : view === 'normalized-depth' ? 2 : view === 'dilution' ? 3 : 0;
    uniforms.uNear.value = camera.near;
    uniforms.uFar.value = camera.far;
    render();
    if (showBoundingBoxes && view === 'normalized-depth') renderBounds(gl, camera);
  }, DEBUG_VIEW_FRAME_ORDER);

  return null;
}
