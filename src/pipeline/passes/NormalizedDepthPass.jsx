import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { NORMALIZED_DEPTH_FRAME_ORDER, RAW_DEPTH_FBO_OPTIONS } from '../../config';
import { renderObjectWithMaterial } from '../utils/renderObjectWithMaterial';
import { useWatercolorSubjects } from '../WatercolorSubjects';
import rawDepthVertex from '../../shaders/rawDepthVertex.vert?raw';
import normalizedDepthFragment from '../../shaders/normalizedDepthFragment.frag?raw';

const RANGE_EPSILON = 0.0001;

function updateObjectDepthRange(object, camera, corner, range) {
  let minDepth = Infinity;
  let maxDepth = -Infinity;

  object.updateWorldMatrix(true, true);
  object.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const bounds = mesh.geometry.boundingBox;
    if (!bounds) return;

    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          corner.set(x, y, z).applyMatrix4(mesh.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
          const depth = -corner.z;
          if (!Number.isFinite(depth)) continue;
          minDepth = Math.min(minDepth, depth);
          maxDepth = Math.max(maxDepth, depth);
        }
      }
    }
  });

  if (!Number.isFinite(minDepth) || !Number.isFinite(maxDepth)) return false;
  range.set(minDepth, Math.max(maxDepth, minDepth + RANGE_EPSILON));
  return true;
}

/** Produces visible per-subject 0–1 depth using stable transformed mesh bounds. */
export function NormalizedDepthPass({ rawDepthRef, outputRef }) {
  const { gl, camera } = useThree();
  const target = useFBO(RAW_DEPTH_FBO_OPTIONS);
  const subjects = useWatercolorSubjects();
  const savedClearColor = useRef(new THREE.Color()).current;
  const corner = useMemo(() => new THREE.Vector3(), []);
  const objectDepthRange = useMemo(() => new THREE.Vector2(), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: rawDepthVertex,
        fragmentShader: normalizedDepthFragment,
        uniforms: {
          tRawDepth: { value: null },
          uObjectDepthRange: { value: new THREE.Vector2() },
        },
        depthTest: true,
        depthWrite: true,
      }),
    []
  );

  if (outputRef) outputRef.current = target;

  useFrame(() => {
    const rawDepth = rawDepthRef.current;
    if (!rawDepth) return;
    camera.updateMatrixWorld();
    const previousTarget = gl.getRenderTarget();
    const previousClearAlpha = gl.getClearAlpha();
    gl.getClearColor(savedClearColor);

    gl.setRenderTarget(target);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    material.uniforms.tRawDepth.value = rawDepth.texture;

    subjects.forEach((subject) => {
      const object = subject.ref.current;
      if (!object || !updateObjectDepthRange(object, camera, corner, objectDepthRange)) return;
      material.uniforms.uObjectDepthRange.value.copy(objectDepthRange);
      renderObjectWithMaterial(gl, object, camera, material);
    });

    gl.setRenderTarget(previousTarget);
    gl.setClearColor(savedClearColor, previousClearAlpha);
  }, NORMALIZED_DEPTH_FRAME_ORDER);

  return null;
}
