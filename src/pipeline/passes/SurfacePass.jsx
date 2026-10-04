import { useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { SURFACE_PASS_FRAME_ORDER, SURFACE_TARGET_OPTIONS } from '../../config';
import { usePaintFrame } from '../PaintingFrame';
import { renderObjectWithMaterial } from '../utils/renderObjectWithMaterial';
import { useWatercolorSubjects } from '../WatercolorSubjects';
import oklabChunk from '../../shaders/chunks/oklab.glsl?raw';
import turbulenceChunk from '../../shaders/chunks/turbulence.glsl?raw';
import surfaceVertex from '../../shaders/surfaceVertex.vert?raw';
import surfaceFragment from '../../shaders/surfaceFragment.frag?raw';

const fragmentShader = `${oklabChunk}\n${turbulenceChunk}\n${surfaceFragment}`;
const RANGE_EPSILON = 0.0001;

/**
 * Each subject's view-depth range from the eight corners of every mesh's
 * transformed bounding box: stable and cheap, but approximate, so visible
 * pixels need not reach exactly 0 or 1.
 */
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
 * The one scene render: everything the painting reads from the geometry, into
 * two targets at once (`target.textures`): [0] the watercolor layer,
 * premultiplied (color override, dilution, and pigment turbulence on the
 * Lambert light), and [1] diffuse, specular mask, per-subject depth, coverage.
 * A depth-only pre-pass of the whole scene comes first, so each pixel is
 * shaded once, by its frontmost surface. Subjects then render one at a time
 * with their own depth range; other meshes render first with depth −1.
 */
export function SurfacePass({
  outputRef,
  lightPosition,
  diffuseAmount,
  baseColor,
  shadowColor,
  colorOverrideEnabled,
  dilution,
  turbulenceIntensity,
  turbulenceScale,
  turbulenceOctaves,
  turbulenceWarp,
  specularShininess,
  specularStrength,
  specularThreshold,
}) {
  const { gl, scene, camera } = useThree();
  const target = useFBO(SURFACE_TARGET_OPTIONS);
  const subjects = useWatercolorSubjects();
  const savedClearColor = useRef(new THREE.Color()).current;
  const scratch = useMemo(
    () => ({ corner: new THREE.Vector3(), range: new THREE.Vector2(), hidden: [] }),
    []
  );
  // Both materials share the vertex source, so their depths match exactly.
  const prepassMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: surfaceVertex,
        fragmentShader: 'void main() {}',
        glslVersion: THREE.GLSL3,
        colorWrite: false,
      }),
    []
  );
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: surfaceVertex,
        fragmentShader,
        glslVersion: THREE.GLSL3,
        uniforms: {
          uLightPositionView: { value: new THREE.Vector3() },
          uDiffuseAmount: { value: 0 },
          uBaseColor: { value: new THREE.Color() },
          uShadowColor: { value: new THREE.Color() },
          uColorOverrideEnabled: { value: true },
          uDilution: { value: 0 },
          uTurbulenceIntensity: { value: 0 },
          uTurbulenceScale: { value: 1 },
          uTurbulenceOctaves: { value: 1 },
          uTurbulenceWarp: { value: 0 },
          uSpecularShininess: { value: 1 },
          uSpecularStrength: { value: 0 },
          uSpecularThreshold: { value: 0 },
          uSubject: { value: false },
          uObjectDepthRange: { value: new THREE.Vector2() },
        },
        depthFunc: THREE.LessEqualDepth,
        depthWrite: false,
      }),
    []
  );

  if (!gl.capabilities.isWebGL2 || !gl.extensions.has('EXT_color_buffer_float')) {
    throw new Error('SurfacePass requires WebGL2 with EXT_color_buffer_float support.');
  }

  if (outputRef) outputRef.current = target;

  usePaintFrame(() => {
    const uniforms = material.uniforms;
    camera.updateMatrixWorld();
    const lightView = uniforms.uLightPositionView.value;
    if (Array.isArray(lightPosition)) lightView.fromArray(lightPosition);
    else lightView.copy(lightPosition);
    lightView.applyMatrix4(camera.matrixWorldInverse);
    uniforms.uDiffuseAmount.value = diffuseAmount;
    uniforms.uBaseColor.value.copy(baseColor);
    uniforms.uShadowColor.value.copy(shadowColor);
    uniforms.uColorOverrideEnabled.value = colorOverrideEnabled;
    uniforms.uDilution.value = dilution;
    uniforms.uTurbulenceIntensity.value = turbulenceIntensity;
    uniforms.uTurbulenceScale.value = turbulenceScale;
    uniforms.uTurbulenceOctaves.value = Math.round(turbulenceOctaves);
    uniforms.uTurbulenceWarp.value = turbulenceWarp;
    uniforms.uSpecularShininess.value = specularShininess;
    uniforms.uSpecularStrength.value = specularStrength;
    uniforms.uSpecularThreshold.value = specularThreshold;

    const previousTarget = gl.getRenderTarget();
    const previousOverride = scene.overrideMaterial;
    const previousClearAlpha = gl.getClearAlpha();
    gl.getClearColor(savedClearColor);

    gl.setRenderTarget(target);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, false);

    scene.overrideMaterial = prepassMaterial;
    gl.render(scene, camera);

    // Meshes that aren't subjects: subjects are hidden for this render only.
    const { hidden } = scratch;
    subjects.forEach(({ ref }) => {
      if (ref.current?.visible) {
        ref.current.visible = false;
        hidden.push(ref.current);
      }
    });
    uniforms.uSubject.value = false;
    scene.overrideMaterial = material;
    gl.render(scene, camera);
    scene.overrideMaterial = previousOverride;
    hidden.forEach((object) => {
      object.visible = true;
    });
    hidden.length = 0;

    subjects.forEach(({ ref }) => {
      const object = ref.current;
      if (!object?.visible) return;
      const ranged = updateObjectDepthRange(object, camera, scratch.corner, scratch.range);
      uniforms.uSubject.value = ranged;
      if (ranged) uniforms.uObjectDepthRange.value.copy(scratch.range);
      renderObjectWithMaterial(gl, object, camera, material);
    });

    gl.setRenderTarget(previousTarget);
    gl.setClearColor(savedClearColor, previousClearAlpha);
  }, SURFACE_PASS_FRAME_ORDER);

  return null;
}
