import { useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
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
  DEFAULT_GRANULATION_INTENSITY,
  DEFAULT_DRY_BRUSH_AMOUNT,
  DEFAULT_DRY_BRUSH_SOFTNESS,
  DEFAULT_DRY_BRUSH_LIGHT_THRESHOLD,
  DEFAULT_DRY_BRUSH_LIGHT_SOFTNESS,
  DEFAULT_SUBSTRATE_DISTORTION,
  DEFAULT_SUBSTRATE_LIGHT_ANGLE,
  DEFAULT_SUBSTRATE_LIGHT_STRENGTH,
  DEFAULT_SUBSTRATE_ROUGHNESS,
} from '../config';
import { CompositePass } from './passes/CompositePass';
import { EdgeDarkeningPass } from './passes/EdgeDarkeningPass';
import { OutputPass } from './passes/OutputPass';
import { SobelPass } from './passes/SobelPass';
import { SubstratePass } from './passes/SubstratePass';
import { SurfacePass } from './passes/SurfacePass';
import { PaintingFrameProvider } from './PaintingFrame';
import { WatercolorSubjectsProvider } from './WatercolorSubjects';

const toColor = (value) => (value?.isColor ? value : new THREE.Color(value));

/**
 * The watercolor pipeline, in five passes that hand render targets along by
 * ref: procedural paper; one scene render of everything the painting reads
 * from the geometry; depth edges; the blurred, edge-darkened paint layer; and
 * the composite on paper. The output then copies the painting to screen with
 * the cursor. Everything before the output repaints only when the painting
 * can have changed (PaintingFrameProvider), and the paper only when it moves.
 */
export function MultiPassPipeline({
  children,
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
  sobelBlurRadius = DEFAULT_SOBEL_BLUR_RADIUS,
  compositionBlurRadius = DEFAULT_COMPOSITION_BLUR_RADIUS,
  turbulenceIntensity = DEFAULT_TURBULENCE_INTENSITY,
  turbulenceScale = DEFAULT_TURBULENCE_SCALE,
  turbulenceOctaves = DEFAULT_TURBULENCE_OCTAVES,
  turbulenceWarp = DEFAULT_TURBULENCE_WARP,
  granulationIntensity = DEFAULT_GRANULATION_INTENSITY,
  dryBrushAmount = DEFAULT_DRY_BRUSH_AMOUNT,
  dryBrushSoftness = DEFAULT_DRY_BRUSH_SOFTNESS,
  dryBrushLightThreshold = DEFAULT_DRY_BRUSH_LIGHT_THRESHOLD,
  dryBrushLightSoftness = DEFAULT_DRY_BRUSH_LIGHT_SOFTNESS,
  edgeDarkening = DEFAULT_EDGE_DARKENING,
  substrateDistortionEnabled = true,
  substrateDistortion = DEFAULT_SUBSTRATE_DISTORTION,
  substrateLightingEnabled = true,
  substrateLightAngle = DEFAULT_SUBSTRATE_LIGHT_ANGLE,
  substrateLightStrength = DEFAULT_SUBSTRATE_LIGHT_STRENGTH,
  substrateRoughness = DEFAULT_SUBSTRATE_ROUGHNESS,
}) {
  const gl = useThree((state) => state.gl);
  const colorOverrideBase = useMemo(() => toColor(colorOverrideBaseColor), [colorOverrideBaseColor]);
  const colorOverrideShadow = useMemo(() => toColor(colorOverrideShadowColor), [colorOverrideShadowColor]);
  const substrate = useMemo(() => toColor(substrateColor), [substrateColor]);
  const substrateRef = useRef(null);
  const surfaceRef = useRef(null);
  const edgesRef = useRef(null);
  const paintRef = useRef(null);
  const paintingRef = useRef(null);

  // Every pass covers its whole target, so nothing clears unless it asks to.
  useLayoutEffect(() => {
    const previous = gl.autoClear;
    gl.autoClear = false;
    return () => {
      gl.autoClear = previous;
    };
  }, [gl]);

  return (
    <WatercolorSubjectsProvider>
      <PaintingFrameProvider>
        {children}
        <SubstratePass outputRef={substrateRef} color={substrate} scale={substrateScale} />
        <SurfacePass
          outputRef={surfaceRef}
          lightPosition={lightPosition}
          diffuseAmount={diffuseAmount}
          baseColor={colorOverrideBase}
          shadowColor={colorOverrideShadow}
          colorOverrideEnabled={colorOverrideEnabled}
          dilution={dilutionStrength}
          turbulenceIntensity={turbulenceIntensity}
          turbulenceScale={turbulenceScale}
          turbulenceOctaves={turbulenceOctaves}
          turbulenceWarp={turbulenceWarp}
          specularShininess={specularShininess}
          specularStrength={specularStrength}
          specularThreshold={specularThreshold}
        />
        <SobelPass surfaceRef={surfaceRef} outputRef={edgesRef} strength={sobelStrength} radius={sobelRadius} />
        <EdgeDarkeningPass
          paintRef={surfaceRef}
          edgesRef={edgesRef}
          outputRef={paintRef}
          paintBlurRadius={compositionBlurRadius}
          edgeBlurRadius={sobelBlurRadius}
          strength={edgeDarkening}
        />
        <CompositePass
          paintRef={paintRef}
          surfaceRef={surfaceRef}
          substrateRef={substrateRef}
          outputRef={paintingRef}
          paperColor={substrate}
          substrateScale={substrateScale}
          distortionEnabled={substrateDistortionEnabled}
          distortion={substrateDistortion}
          granulationIntensity={granulationIntensity}
          dryBrushAmount={dryBrushAmount}
          dryBrushSoftness={dryBrushSoftness}
          dryBrushLightThreshold={dryBrushLightThreshold}
          dryBrushLightSoftness={dryBrushLightSoftness}
          lightingEnabled={substrateLightingEnabled}
          lightAngle={substrateLightAngle}
          lightStrength={substrateLightStrength}
          roughness={substrateRoughness}
        />
        <OutputPass paintingRef={paintingRef} substrateRef={substrateRef} substrateScale={substrateScale} />
      </PaintingFrameProvider>
    </WatercolorSubjectsProvider>
  );
}
