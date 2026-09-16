import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import {
  NORMALIZED_DEPTH_FRAME_ORDER,
  RAW_DEPTH_FBO_OPTIONS,
  SUBJECT_RANGE_FRAME_ORDER,
} from '../../config';
import { createFullscreenQuad, renderFullscreenQuad } from '../utils/fullscreenQuad';
import { renderObjectWithMaterial } from '../utils/renderObjectWithMaterial';
import { useWatercolorSubjects } from '../WatercolorSubjects';
import rawDepthVertex from '../../shaders/rawDepthVertex.vert?raw';
import subjectDepthFragment from '../../shaders/subjectDepthFragment.frag?raw';
import reductionFragment from '../../shaders/depthReductionFragment.frag?raw';
import normalizedDepthFragment from '../../shaders/normalizedDepthFragment.frag?raw';

const REDUCTION_SCALE = 0.5;

function useReductionTargets(width, height) {
  const targets = useMemo(() => {
    const next = [];
    let targetWidth = Math.max(1, Math.ceil(width * REDUCTION_SCALE));
    let targetHeight = Math.max(1, Math.ceil(height * REDUCTION_SCALE));
    while (targetWidth > 1 || targetHeight > 1) {
      targetWidth = Math.max(1, Math.ceil(targetWidth / 2));
      targetHeight = Math.max(1, Math.ceil(targetHeight / 2));
      next.push(
        new THREE.WebGLRenderTarget(targetWidth, targetHeight, {
          ...RAW_DEPTH_FBO_OPTIONS,
          depthBuffer: false,
          stencilBuffer: false,
        })
      );
    }
    return next;
  }, [height, width]);

  useEffect(() => () => targets.forEach((target) => target.dispose()), [targets]);
  return targets;
}

function SubjectDepthRangePass({ subject, rawDepthRef, rangeRefs }) {
  const { gl, camera, size } = useThree();
  const capture = useFBO(
    Math.max(1, Math.ceil(size.width * REDUCTION_SCALE)),
    Math.max(1, Math.ceil(size.height * REDUCTION_SCALE)),
    RAW_DEPTH_FBO_OPTIONS
  );
  const reductions = useReductionTargets(size.width, size.height);
  const captureMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: rawDepthVertex,
        fragmentShader: subjectDepthFragment,
        uniforms: {
          tRawDepth: { value: null },
          uResolution: { value: new THREE.Vector2() },
        },
        depthTest: true,
        depthWrite: true,
      }),
    []
  );
  const reductionMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: reductionFragment,
        uniforms: {
          tInput: { value: null },
          uTexelSize: { value: new THREE.Vector2() },
        },
      }),
    []
  );
  const quad = useMemo(() => createFullscreenQuad(reductionMaterial), [reductionMaterial]);

  useFrame(() => {
    const object = subject.ref.current;
    const rawDepth = rawDepthRef.current;
    if (!object || !rawDepth) return;

    captureMaterial.uniforms.tRawDepth.value = rawDepth.texture;
    captureMaterial.uniforms.uResolution.value.set(capture.width, capture.height);
    gl.setRenderTarget(capture);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    renderObjectWithMaterial(gl, object, camera, captureMaterial);

    let source = capture;
    reductions.forEach((target) => {
      reductionMaterial.uniforms.tInput.value = source.texture;
      reductionMaterial.uniforms.uTexelSize.value.set(1 / source.width, 1 / source.height);
      renderFullscreenQuad(gl, quad, reductionMaterial, target);
      source = target;
    });
    rangeRefs.current.set(subject.id, source);
  }, SUBJECT_RANGE_FRAME_ORDER);

  return null;
}

/** Produces per-subject 0–1 depth from raw camera depth and GPU min/max reductions. */
export function NormalizedDepthPass({ rawDepthRef, outputRef }) {
  const { gl, camera, size } = useThree();
  const target = useFBO(size.width, size.height, RAW_DEPTH_FBO_OPTIONS);
  const subjects = useWatercolorSubjects();
  const rangeRefs = useRef(new Map());
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: rawDepthVertex,
        fragmentShader: normalizedDepthFragment,
        uniforms: {
          tRawDepth: { value: null },
          tRange: { value: null },
          uResolution: { value: new THREE.Vector2() },
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
    gl.setRenderTarget(target);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    material.uniforms.tRawDepth.value = rawDepth.texture;
    material.uniforms.uResolution.value.set(size.width, size.height);

    subjects.forEach((subject) => {
      const object = subject.ref.current;
      const range = rangeRefs.current.get(subject.id);
      if (!object || !range) return;
      material.uniforms.tRange.value = range.texture;
      renderObjectWithMaterial(gl, object, camera, material);
    });
  }, NORMALIZED_DEPTH_FRAME_ORDER);

  return subjects.map((subject) => (
    <SubjectDepthRangePass
      key={subject.id}
      subject={subject}
      rawDepthRef={rawDepthRef}
      rangeRefs={rangeRefs}
    />
  ));
}
