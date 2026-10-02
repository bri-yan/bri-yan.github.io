import { createRef, useMemo } from 'react';
import * as THREE from 'three';
import {
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
  DEFAULT_COMPOSITION_BLUR_RADIUS,
  DEFAULT_SOBEL_BLUR_RADIUS,
  DEFAULT_EDGE_DARKENING,
  DEFAULT_TURBULENCE_INTENSITY,
  DEFAULT_TURBULENCE_OCTAVES,
  DEFAULT_TURBULENCE_SCALE,
  DEFAULT_TURBULENCE_WARP,
  DEFAULT_SUBSTRATE_DISTORTION,
  DEFAULT_SUBSTRATE_LIGHT_ANGLE,
  DEFAULT_SUBSTRATE_LIGHT_STRENGTH,
  DEFAULT_SUBSTRATE_ROUGHNESS,
  PIPELINE_FBO_KEYS,
  PIPELINE_STAGES,
} from '../config';
import { BlurPass } from './passes/BlurPass';
import { EdgeDarkeningPass } from './passes/EdgeDarkeningPass';
import { ColorOverridePass } from './passes/ColorOverridePass';
import { DiffuseCompositionPass } from './passes/DiffuseCompositionPass';
import { DiffusePass } from './passes/DiffusePass';
import { DilutionPass } from './passes/DilutionPass';
import { ScenePass } from './passes/ScenePass';
import { SpecularPass } from './passes/SpecularPass';
import { SobelPass } from './passes/SobelPass';
import { SubstratePass } from './passes/SubstratePass';
import { TurbulencePass } from './passes/TurbulencePass';
import { DepthPass } from './passes/DepthPass';
import { OutputPass } from './passes/OutputPass';
import { DebugPass } from './passes/DebugPass';
import { WatercolorSubjectsProvider } from './WatercolorSubjects';

const toColor = (value) => (value?.isColor ? value : new THREE.Color(value));

/**
 * The watercolor pipeline. Sibling passes capture the scene (color, depth,
 * lighting), build a paint layer, and finish it on paper in substrate fx,
 * which the output pass draws to screen.
 */
export function MultiPassPipeline({
  children,
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
  sobelBlurRadius = DEFAULT_SOBEL_BLUR_RADIUS,
  compositionBlurRadius = DEFAULT_COMPOSITION_BLUR_RADIUS,
  turbulenceIntensity = DEFAULT_TURBULENCE_INTENSITY,
  turbulenceScale = DEFAULT_TURBULENCE_SCALE,
  turbulenceOctaves = DEFAULT_TURBULENCE_OCTAVES,
  turbulenceWarp = DEFAULT_TURBULENCE_WARP,
  edgeDarkening = DEFAULT_EDGE_DARKENING,
  substrateDistortionEnabled = true,
  substrateDistortion = DEFAULT_SUBSTRATE_DISTORTION,
  substrateLightingEnabled = true,
  substrateLightAngle = DEFAULT_SUBSTRATE_LIGHT_ANGLE,
  substrateLightStrength = DEFAULT_SUBSTRATE_LIGHT_STRENGTH,
  substrateRoughness = DEFAULT_SUBSTRATE_ROUGHNESS,
}) {
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
        <ScenePass outputRef={fbos.scene} active={debugView === 'scene'} />
        <DepthPass outputRef={fbos.depth} />
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
        <TurbulencePass
          outputRef={fbos.turbulence}
          scale={turbulenceScale}
          octaves={turbulenceOctaves}
          warp={turbulenceWarp}
        />
        <DiffuseCompositionPass
          colorOverrideRef={fbos.colorOverride}
          dilutionRef={fbos.dilution}
          turbulenceRef={fbos.turbulence}
          outputRef={fbos.diffuseComposition}
          turbulenceIntensity={turbulenceIntensity}
        />
        <SpecularPass
          outputRef={fbos.specular}
          lightPosition={lightPosition}
          shininess={specularShininess}
          strength={specularStrength}
          threshold={specularThreshold}
        />
        <SobelPass
          depthRef={fbos.depth}
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
        <EdgeDarkeningPass
          paintRef={fbos.diffuseCompositionBlur}
          edgesRef={fbos.sobelBlur}
          outputRef={fbos.edgeDarkening}
          strength={edgeDarkening}
        />
        <OutputPass
          paintRef={fbos.edgeDarkening}
          specularRef={fbos.specular}
          substrateRef={fbos.substrate}
          paperColor={substrate}
          substrateScale={substrateScale}
          distortionEnabled={substrateDistortionEnabled}
          distortion={substrateDistortion}
          lightingEnabled={substrateLightingEnabled}
          lightAngle={substrateLightAngle}
          lightStrength={substrateLightStrength}
          roughness={substrateRoughness}
        />
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
