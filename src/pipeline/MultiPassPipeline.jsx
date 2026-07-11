import { useMemo, createRef } from 'react';
import * as THREE from 'three';
import {
  DEFAULT_PAINT_BASE_COLOR,
  DEFAULT_PAINT_THRESHOLD,
  DEFAULT_PAINT_WETNESS,
  DEFAULT_EDGE_WEIGHT,
  DEFAULT_EDGE_PAPER_WEIGHT,
  DEFAULT_EDGE_SHARPNESS,
  DEFAULT_EDGE_DARKNESS,
  DEFAULT_BODY_WEIGHT,
  DEFAULT_BODY_PAPER_WEIGHT,
  DEFAULT_BODY_OPACITY,
  DEFAULT_DIFFUSE_WEIGHT,
  DEFAULT_SPECULAR_WEIGHT,
  DEFAULT_BLINN_PHONG_LIGHT_POSITION,
  DEFAULT_BLINN_PHONG_SHININESS,
  DEFAULT_BLINN_PHONG_AMBIENT_STRENGTH,
  DEFAULT_BLINN_PHONG_DIFFUSE_STRENGTH,
  DEFAULT_BLINN_PHONG_SPECULAR_STRENGTH,
  DEFAULT_BLINN_PHONG_SPECULAR_THRESHOLD,
  DEFAULT_BLUR_WEIGHT,
  DEFAULT_BLUR_STRENGTH,
  DEFAULT_BLUR_ITERATIONS,
  DEFAULT_PAPER_REPEAT_X,
  DEFAULT_PAPER_REPEAT_Y,
  DEFAULT_COMPOSITOR_BACKGROUND,
  DEFAULT_COMPOSITOR_DIFFUSE_GAIN,
} from '../config';
import { IntensityPass } from './passes/IntensityPass';
import { EdgePass } from './passes/EdgePass';
import { BodyPass } from './passes/BodyPass';
import { DiffusePass } from './passes/DiffusePass';
import { SpecularPass } from './passes/SpecularPass';
import { BlurPass } from './passes/BlurPass';
import { CompositorPass } from './passes/CompositorPass';
import { PaperTexturePass } from './passes/PaperTexturePass';
import { DebugViewPass } from './passes/DebugViewPass';

const toColor = (value) => (value?.isColor ? value : new THREE.Color(value));

/**
 * Multi-pass watercolor pipeline. Passes are flat siblings that write to
 * per-pass FBOs (the `fbos` map) and are ordered by useFrame priority;
 * CompositorPass blends them to the screen. Set `debugView` to any fbos key
 * to inspect that pass's raw output instead of the composite.
 */
export function MultiPassPipeline({
  children,
  paintBaseColor = DEFAULT_PAINT_BASE_COLOR,
  paintThreshold = DEFAULT_PAINT_THRESHOLD,
  paintWetness = DEFAULT_PAINT_WETNESS,
  edgeWeight = DEFAULT_EDGE_WEIGHT,
  edgePaperWeight = DEFAULT_EDGE_PAPER_WEIGHT,
  edgeSharpness = DEFAULT_EDGE_SHARPNESS,
  edgeDarkness = DEFAULT_EDGE_DARKNESS,
  bodyWeight = DEFAULT_BODY_WEIGHT,
  bodyPaperWeight = DEFAULT_BODY_PAPER_WEIGHT,
  bodyOpacity = DEFAULT_BODY_OPACITY,
  diffuseWeight = DEFAULT_DIFFUSE_WEIGHT,
  specularWeight = DEFAULT_SPECULAR_WEIGHT,
  lightingLightPosition = DEFAULT_BLINN_PHONG_LIGHT_POSITION,
  lightingShininess = DEFAULT_BLINN_PHONG_SHININESS,
  lightingAmbientStrength = DEFAULT_BLINN_PHONG_AMBIENT_STRENGTH,
  lightingDiffuseStrength = DEFAULT_BLINN_PHONG_DIFFUSE_STRENGTH,
  lightingSpecularStrength = DEFAULT_BLINN_PHONG_SPECULAR_STRENGTH,
  lightingSpecularThreshold = DEFAULT_BLINN_PHONG_SPECULAR_THRESHOLD,
  blurWeight = DEFAULT_BLUR_WEIGHT,
  blurStrength = DEFAULT_BLUR_STRENGTH,
  blurIterations = DEFAULT_BLUR_ITERATIONS,
  paperRepeatX = DEFAULT_PAPER_REPEAT_X,
  paperRepeatY = DEFAULT_PAPER_REPEAT_Y,
  backgroundColor = DEFAULT_COMPOSITOR_BACKGROUND,
  diffuseGain = DEFAULT_COMPOSITOR_DIFFUSE_GAIN,
  debugView = 'final',
  debugChannel = 'rgb',
}) {
  const baseColor = useMemo(() => toColor(paintBaseColor), [paintBaseColor]);
  const bgColor = useMemo(() => toColor(backgroundColor), [backgroundColor]);

  // One FBO ref per pass; keys double as the debug-view names (DEBUG_VIEWS).
  const fbos = useMemo(
    () => ({
      paper: createRef(),
      intensity: createRef(),
      blur: createRef(),
      edge: createRef(),
      body: createRef(),
      diffuse: createRef(),
      diffuseBlur: createRef(),
      specular: createRef(),
    }),
    []
  );

  return (
    <>
      {children}
      <PaperTexturePass outputRef={fbos.paper} repeatX={paperRepeatX} repeatY={paperRepeatY} />
      <IntensityPass outputRef={fbos.intensity} />
      <BlurPass
        inputRef={fbos.intensity}
        outputRef={fbos.blur}
        blurStrength={blurStrength}
        blurIterations={blurIterations}
      />
      <EdgePass
        blurRef={fbos.blur}
        intensityRef={fbos.intensity}
        paperRef={fbos.paper}
        outputRef={fbos.edge}
        baseColor={baseColor}
        threshold={paintThreshold}
        wetness={paintWetness}
        paperWeight={edgePaperWeight}
        sharpness={edgeSharpness}
        darkness={edgeDarkness}
      />
      <BodyPass
        inputRef={fbos.blur}
        paperRef={fbos.paper}
        outputRef={fbos.body}
        baseColor={baseColor}
        threshold={paintThreshold}
        wetness={paintWetness}
        paperWeight={bodyPaperWeight}
        opacity={bodyOpacity}
      />
      <DiffusePass
        outputRef={fbos.diffuse}
        lightPosition={lightingLightPosition}
        ambientStrength={lightingAmbientStrength}
        diffuseStrength={lightingDiffuseStrength}
        baseColor={baseColor}
      />
      <BlurPass
        inputRef={fbos.diffuse}
        outputRef={fbos.diffuseBlur}
        blurStrength={blurStrength}
        blurIterations={blurIterations}
      />
      <SpecularPass
        outputRef={fbos.specular}
        lightPosition={lightingLightPosition}
        shininess={lightingShininess}
        specularStrength={lightingSpecularStrength}
        specularThreshold={lightingSpecularThreshold}
      />
      <CompositorPass
        edgeRef={fbos.edge}
        bodyRef={fbos.body}
        diffuseRef={fbos.diffuseBlur}
        specularRef={fbos.specular}
        blurRef={fbos.blur}
        edgeWeight={edgeWeight}
        bodyWeight={bodyWeight}
        diffuseWeight={diffuseWeight}
        specularWeight={specularWeight}
        blurWeight={blurWeight}
        diffuseGain={diffuseGain}
        backgroundColor={bgColor}
      />
      <DebugViewPass passes={fbos} view={debugView} channel={debugChannel} />
    </>
  );
}
