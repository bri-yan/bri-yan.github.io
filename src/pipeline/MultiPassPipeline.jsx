import { createRef, useMemo } from 'react';
import * as THREE from 'three';
import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_COLOR_OVERRIDE_BASE_COLOR,
  DEFAULT_COLOR_OVERRIDE_SHADOW_COLOR,
  DEFAULT_DIFFUSE_AMOUNT,
  DEFAULT_DILUTION_STRENGTH,
  DEFAULT_LIGHT_POSITION,
  DEFAULT_SPECULAR_SHININESS,
  DEFAULT_SPECULAR_STRENGTH,
  DEFAULT_SPECULAR_THRESHOLD,
  DEFAULT_SUBSTRATE_COLOR,
  DEFAULT_SUBSTRATE_SCALE,
  DEFAULT_SOBEL_RADIUS,
  DEFAULT_SOBEL_STRENGTH,
  DEFAULT_BLUR_RADIUS,
  PIPELINE_FBO_KEYS,
  PIPELINE_STAGES,
} from '../config';
import { BlurPass } from './passes/BlurPass';
import { ColorOverridePass } from './passes/ColorOverridePass';
import { DiffuseCompositionPass } from './passes/DiffuseCompositionPass';
import { DiffusePass } from './passes/DiffusePass';
import { DilutionPass } from './passes/DilutionPass';
import { RawColorPass } from './passes/RawColorPass';
import { RawDepthPass } from './passes/RawDepthPass';
import { SpecularPass } from './passes/SpecularPass';
import { SobelPass } from './passes/SobelPass';
import { SubstratePass } from './passes/SubstratePass';
import { NormalizedDepthPass } from './passes/NormalizedDepthPass';
import { OutputPass } from './passes/OutputPass';
import { DebugPass } from './passes/DebugPass';
import { WatercolorSubjectsProvider } from './WatercolorSubjects';

const toColor = (value) => (value?.isColor ? value : new THREE.Color(value));

/**
 * Minimal render-pipeline foundation. The live scene is captured unchanged by
 * raw-color and raw-depth sibling captures, then the normal color output.
 */
export function MultiPassPipeline({
  children,
  backgroundColor = DEFAULT_BACKGROUND_COLOR,
  debugView = 'output',
  debugChannel = 'rgb',
  showBoundingBoxes = false,
  lightPosition = DEFAULT_LIGHT_POSITION,
  diffuseAmount = DEFAULT_DIFFUSE_AMOUNT,
  colorOverrideBaseColor = DEFAULT_COLOR_OVERRIDE_BASE_COLOR,
  colorOverrideShadowColor = DEFAULT_COLOR_OVERRIDE_SHADOW_COLOR,
  colorOverrideEnabled = true,
  dilutionStrength = DEFAULT_DILUTION_STRENGTH,
  specularShininess = DEFAULT_SPECULAR_SHININESS,
  specularStrength = DEFAULT_SPECULAR_STRENGTH,
  specularThreshold = DEFAULT_SPECULAR_THRESHOLD,
  sobelStrength = DEFAULT_SOBEL_STRENGTH,
  sobelRadius = DEFAULT_SOBEL_RADIUS,
  substrateColor = DEFAULT_SUBSTRATE_COLOR,
  substrateScale = DEFAULT_SUBSTRATE_SCALE,
  showSubstrateHeight = false,
  sobelBlurRadius = DEFAULT_BLUR_RADIUS,
  compositionBlurRadius = DEFAULT_BLUR_RADIUS,
}) {
  const background = useMemo(() => toColor(backgroundColor), [backgroundColor]);
  const colorOverrideBase = useMemo(() => toColor(colorOverrideBaseColor), [colorOverrideBaseColor]);
  const colorOverrideShadow = useMemo(() => toColor(colorOverrideShadowColor), [colorOverrideShadowColor]);
  const substrate = useMemo(() => toColor(substrateColor), [substrateColor]);
  const fbos = useMemo(
    () => Object.fromEntries(PIPELINE_FBO_KEYS.map((key) => [key, createRef()])),
    []
  );
  const debugSources = useMemo(
    () =>
      Object.fromEntries(
        PIPELINE_STAGES.filter(({ fboKey, debugView }) => fboKey && debugView).map(
          ({ debugView, fboKey }) => [debugView, fbos[fboKey]]
        )
      ),
    [fbos]
  );

  return (
    <>
      <WatercolorSubjectsProvider>
        {children}
        <SubstratePass outputRef={fbos.substrate} color={substrate} scale={substrateScale} />
        <RawColorPass outputRef={fbos.color} />
        <RawDepthPass outputRef={fbos.rawDepth} />
        <DiffusePass
          outputRef={fbos.diffuse}
          lightPosition={lightPosition}
          diffuseAmount={diffuseAmount}
        />
        <ColorOverridePass
          diffuseRef={fbos.diffuse}
          outputRef={fbos.colorOverride}
          baseColor={colorOverrideBase}
          shadowColor={colorOverrideShadow}
          enabled={colorOverrideEnabled}
        />
        <DilutionPass
          diffuseRef={fbos.diffuse}
          outputRef={fbos.dilution}
          strength={dilutionStrength}
        />
        <DiffuseCompositionPass
          colorOverrideRef={fbos.colorOverride}
          dilutionRef={fbos.dilution}
          outputRef={fbos.diffuseComposition}
        />
        <SpecularPass
          outputRef={fbos.specular}
          lightPosition={lightPosition}
          shininess={specularShininess}
          strength={specularStrength}
          threshold={specularThreshold}
        />
        <NormalizedDepthPass rawDepthRef={fbos.rawDepth} outputRef={fbos.normalizedDepth} />
        <SobelPass
          normalizedDepthRef={fbos.normalizedDepth}
          outputRef={fbos.sobel}
          strength={sobelStrength}
          radius={sobelRadius}
        />
        <BlurPass inputRef={fbos.sobel} outputRef={fbos.sobelBlur} radius={sobelBlurRadius} />
        <BlurPass
          inputRef={fbos.diffuseComposition}
          outputRef={fbos.diffuseCompositionBlur}
          radius={compositionBlurRadius}
        />
        <OutputPass colorRef={fbos.color} backgroundColor={background} />
        <DebugPass
          passes={debugSources}
          view={debugView}
          channel={debugChannel}
          showBoundingBoxes={showBoundingBoxes}
          showSubstrateHeight={showSubstrateHeight}
        />
      </WatercolorSubjectsProvider>
    </>
  );
}
