import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { DEPTH_FBO_OPTIONS, DEPTH_PASS_FRAME_ORDER } from '../../config';
import { renderObjectWithMaterial } from '../utils/renderObjectWithMaterial';
import { useWatercolorSubjects } from '../WatercolorSubjects';
import depthVertex from '../../shaders/depthVertex.vert?raw';
import depthFragment from '../../shaders/depthFragment.frag?raw';

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

/**
 * Per-subject 0–1 visible depth from stable transformed mesh bounds. A
 * depth-only pre-pass of the whole scene fills the depth buffer, then each
 * subject renders with LessEqual testing, so anything in front of it (another
 * subject or any other mesh) hides it without a separate raw-depth target.
 */
export function DepthPass({ outputRef }) {
  const { gl, scene, camera } = useThree();
  const target = useFBO(DEPTH_FBO_OPTIONS);
  const subjects = useWatercolorSubjects();
  const savedClearColor = useRef(new THREE.Color()).current;
  const corner = useMemo(() => new THREE.Vector3(), []);
  const objectDepthRange = useMemo(() => new THREE.Vector2(), []);
  const prepassMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: depthVertex,
        fragmentShader: 'void main() { gl_FragColor = vec4(0.0); }',
        colorWrite: false,
      }),
    []
  );
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: depthVertex,
        fragmentShader: depthFragment,
        uniforms: {
          uObjectDepthRange: { value: new THREE.Vector2() },
        },
        depthFunc: THREE.LessEqualDepth,
        depthWrite: false,
      }),
    []
  );

  if (!gl.capabilities.isWebGL2 || !gl.extensions.has('EXT_color_buffer_float')) {
    throw new Error('DepthPass requires WebGL2 with EXT_color_buffer_float support.');
  }

  if (outputRef) outputRef.current = target;

  useFrame(() => {
    camera.updateMatrixWorld();
    const previousTarget = gl.getRenderTarget();
    const previousOverride = scene.overrideMaterial;
    const previousAutoClear = gl.autoClear;
    const previousClearAlpha = gl.getClearAlpha();
    gl.getClearColor(savedClearColor);

    gl.setRenderTarget(target);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    gl.autoClear = false; // keep the pre-pass depth for the subject renders

    scene.overrideMaterial = prepassMaterial;
    gl.render(scene, camera);
    scene.overrideMaterial = previousOverride;

    subjects.forEach((subject) => {
      const object = subject.ref.current;
      if (!object || !updateObjectDepthRange(object, camera, corner, objectDepthRange)) return;
      material.uniforms.uObjectDepthRange.value.copy(objectDepthRange);
      renderObjectWithMaterial(gl, object, camera, material);
    });

    gl.autoClear = previousAutoClear;
    gl.setRenderTarget(previousTarget);
    gl.setClearColor(savedClearColor, previousClearAlpha);
  }, DEPTH_PASS_FRAME_ORDER);

  return null;
}
