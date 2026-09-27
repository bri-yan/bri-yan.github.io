import { useMemo, useRef } from 'react';
import { button, folder, useControls } from 'leva';
import {
  DEBUG_CHANNELS,
  DEBUG_VIEWS,
  DEFAULT_COLOR_OVERRIDE_BASE_COLOR,
  DEFAULT_COLOR_OVERRIDE_SHADOW_COLOR,
  DEFAULT_DIFFUSE_AMOUNT,
  DEFAULT_DILUTION_STRENGTH,
  DEFAULT_LIGHT_POSITION,
  DEFAULT_SPECULAR_SHININESS,
  DEFAULT_SPECULAR_STRENGTH,
  DEFAULT_SPECULAR_THRESHOLD,
  DEFAULT_SOBEL_RADIUS,
  DEFAULT_SOBEL_STRENGTH,
  DEFAULT_SUBSTRATE_COLOR,
  DEFAULT_SUBSTRATE_SCALE,
  DEFAULT_COMPOSITION_BLUR_RADIUS,
  DEFAULT_SOBEL_BLUR_RADIUS,
  DEFAULT_EDGE_DARKENING,
  BLUR_MAX_RADIUS,
  DEFAULT_SUBSTRATE_DISTORTION,
  DEFAULT_SUBSTRATE_LIGHT_ANGLE,
  DEFAULT_SUBSTRATE_LIGHT_STRENGTH,
  DEFAULT_SUBSTRATE_ROUGHNESS,
} from '../config';

const STORAGE_KEY = 'watercolor-pipeline-controls-v2';
const LEGACY_STORAGE_KEY = 'watercolor-pipeline-controls';
const DEFAULTS = {
  showBoundingBoxes: false,
  lightPosition: DEFAULT_LIGHT_POSITION,
  diffuseAmount: DEFAULT_DIFFUSE_AMOUNT,
  colorOverrideBaseColor: `#${DEFAULT_COLOR_OVERRIDE_BASE_COLOR.getHexString()}`,
  colorOverrideShadowColor: `#${DEFAULT_COLOR_OVERRIDE_SHADOW_COLOR.getHexString()}`,
  colorOverrideEnabled: true,
  dilutionStrength: DEFAULT_DILUTION_STRENGTH,
  specularShininess: DEFAULT_SPECULAR_SHININESS,
  specularStrength: DEFAULT_SPECULAR_STRENGTH,
  specularThreshold: DEFAULT_SPECULAR_THRESHOLD,
  sobelStrength: DEFAULT_SOBEL_STRENGTH,
  sobelRadius: DEFAULT_SOBEL_RADIUS,
  substrateColor: `#${DEFAULT_SUBSTRATE_COLOR.getHexString()}`,
  substrateScale: DEFAULT_SUBSTRATE_SCALE,
  showSubstrateHeight: false,
  compositionBlurRadius: DEFAULT_COMPOSITION_BLUR_RADIUS,
  sobelBlurRadius: DEFAULT_SOBEL_BLUR_RADIUS,
  edgeDarkening: DEFAULT_EDGE_DARKENING,
  substrateDistortionEnabled: true,
  substrateDistortion: DEFAULT_SUBSTRATE_DISTORTION,
  substrateLightingEnabled: true,
  substrateLightAngle: DEFAULT_SUBSTRATE_LIGHT_ANGLE,
  substrateLightStrength: DEFAULT_SUBSTRATE_LIGHT_STRENGTH,
  substrateRoughness: DEFAULT_SUBSTRATE_ROUGHNESS,
};

const blurRadius = (value) => ({ value, min: 0, max: BLUR_MAX_RADIUS, step: 0.5 });

function loadSaved() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
    if (saved.showBoundingBoxes === undefined) saved.showBoundingBoxes = saved.showNormalizedDepthBounds;
    return saved;
  } catch {
    return {};
  }
}

/**
 * Leva controls for the active pipeline only. Debug views are derived from the
 * shared pipeline definition; session actions persist only live tunables.
 */
export function usePipelineControls() {
  const saved = useMemo(loadSaved, []);

  const [debug, setDebug] = useControls('Debug', () => ({
    view: {
      value: 'output',
      options: DEBUG_VIEWS,
      // Picking a view explicitly leaves the substrate height map.
      onChange: (_, __, { initial }) => {
        if (!initial) setSubstrate({ showHeightMap: false });
      },
      transient: false,
    },
    channel: {
      value: 'rgb',
      options: DEBUG_CHANNELS,
      render: (get) => get('Debug.view') === 'scene',
    },
    'show bounding boxes': {
      value: saved.showBoundingBoxes ?? DEFAULTS.showBoundingBoxes,
      render: (get) => get('Debug.view') === 'normalized-depth',
    },
  }));

  const [lighting, setLighting] = useControls('Lighting', () => ({
    Diffuse: folder({
      lightPosition: saved.lightPosition ?? DEFAULTS.lightPosition,
      diffuseAmount: {
        value: saved.diffuseAmount ?? DEFAULTS.diffuseAmount,
        min: 0,
        max: 1,
        step: 0.01,
      },
    }),
    'Color Override': folder({
      enabled: saved.colorOverrideEnabled ?? DEFAULTS.colorOverrideEnabled,
      baseColor: saved.colorOverrideBaseColor ?? DEFAULTS.colorOverrideBaseColor,
      shadowColor: saved.colorOverrideShadowColor ?? DEFAULTS.colorOverrideShadowColor,
    }),
    Specular: folder({
      specularShininess: {
        label: 'shininess',
        value: saved.specularShininess ?? DEFAULTS.specularShininess,
        min: 1,
        max: 128,
        step: 1,
      },
      specularStrength: {
        label: 'strength',
        value: saved.specularStrength ?? DEFAULTS.specularStrength,
        min: 0,
        max: 1,
        step: 0.01,
      },
      specularThreshold: {
        label: 'threshold',
        value: saved.specularThreshold ?? DEFAULTS.specularThreshold,
        min: 0,
        max: 1,
        step: 0.01,
      },
    }),
    Dilution: folder({
      dilutionStrength: {
        label: 'strength',
        value: saved.dilutionStrength ?? DEFAULTS.dilutionStrength,
        min: 0,
        max: 1,
        step: 0.01,
      },
    }),
  }));

  const [sobel, setSobel] = useControls('Sobel', () => ({
    strength: {
      value: saved.sobelStrength ?? DEFAULTS.sobelStrength,
      min: 0,
      max: 4,
      step: 0.01,
    },
    radius: {
      value: saved.sobelRadius ?? DEFAULTS.sobelRadius,
      min: 1,
      max: 6,
      step: 1,
    },
  }));

  const [substrate, setSubstrate] = useControls('Substrate', () => ({
    showHeightMap: {
      label: 'height map',
      value: saved.showSubstrateHeight ?? DEFAULTS.showSubstrateHeight,
    },
    color: saved.substrateColor ?? DEFAULTS.substrateColor,
    scale: {
      value: saved.substrateScale ?? DEFAULTS.substrateScale,
      min: 0.5,
      max: 12,
      step: 0.1,
    },
  }));

  // Radii are in CSS pixels; 0 passes the input through unchanged.
  const [blur, setBlur] = useControls('Blur', () => ({
    compositionBlurRadius: {
      label: 'diffuse',
      ...blurRadius(saved.compositionBlurRadius ?? DEFAULTS.compositionBlurRadius),
    },
    sobelBlurRadius: {
      label: 'sobel',
      ...blurRadius(saved.sobelBlurRadius ?? DEFAULTS.sobelBlurRadius),
    },
  }));

  // Edge width is Blur › sobel (the thesis's W); strength 0 leaves the paint unchanged.
  const [edgeDarkening, setEdgeDarkening] = useControls('Edge Darkening', () => ({
    strength: {
      value: saved.edgeDarkening ?? DEFAULTS.edgeDarkening,
      min: 0,
      max: 5,
      step: 0.05,
    },
  }));

  // Each effect toggles independently; its settings show only while it is on.
  const [substrateFx, setSubstrateFx] = useControls('Substrate FX', () => ({
    substrateDistortionEnabled: {
      label: 'distortion',
      value: saved.substrateDistortionEnabled ?? DEFAULTS.substrateDistortionEnabled,
    },
    substrateDistortion: {
      label: 'amount',
      value: saved.substrateDistortion ?? DEFAULTS.substrateDistortion,
      min: 0,
      max: 8,
      step: 0.1,
      render: (get) => get('Substrate FX.substrateDistortionEnabled'),
    },
    substrateLightingEnabled: {
      label: 'lighting',
      value: saved.substrateLightingEnabled ?? DEFAULTS.substrateLightingEnabled,
    },
    substrateLightAngle: {
      label: 'light angle',
      value: saved.substrateLightAngle ?? DEFAULTS.substrateLightAngle,
      min: 0,
      max: 360,
      step: 1,
      render: (get) => get('Substrate FX.substrateLightingEnabled'),
    },
    substrateLightStrength: {
      label: 'light strength',
      value: saved.substrateLightStrength ?? DEFAULTS.substrateLightStrength,
      min: 0,
      max: 1,
      step: 0.01,
      render: (get) => get('Substrate FX.substrateLightingEnabled'),
    },
    substrateRoughness: {
      label: 'roughness',
      value: saved.substrateRoughness ?? DEFAULTS.substrateRoughness,
      min: 0,
      max: 4,
      step: 0.05,
      render: (get) => get('Substrate FX.substrateLightingEnabled'),
    },
  }));

  const values = {
    showBoundingBoxes: debug['show bounding boxes'],
    lightPosition: lighting.lightPosition,
    diffuseAmount: lighting.diffuseAmount,
    colorOverrideBaseColor: lighting.baseColor,
    colorOverrideShadowColor: lighting.shadowColor,
    colorOverrideEnabled: lighting.enabled,
    dilutionStrength: lighting.dilutionStrength,
    specularShininess: lighting.specularShininess,
    specularStrength: lighting.specularStrength,
    specularThreshold: lighting.specularThreshold,
    sobelStrength: sobel.strength,
    sobelRadius: sobel.radius,
    substrateColor: substrate.color,
    substrateScale: substrate.scale,
    showSubstrateHeight: substrate.showHeightMap,
    compositionBlurRadius: blur.compositionBlurRadius,
    sobelBlurRadius: blur.sobelBlurRadius,
    edgeDarkening: edgeDarkening.strength,
    ...substrateFx,
  };
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useControls('Session', () => ({
    save: button(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valuesRef.current));
    }),
    'reset to defaults': button(() => {
      localStorage.removeItem(STORAGE_KEY);
      setDebug({
        'show bounding boxes': DEFAULTS.showBoundingBoxes,
      });
      setLighting({
        lightPosition: DEFAULTS.lightPosition,
        diffuseAmount: DEFAULTS.diffuseAmount,
        enabled: DEFAULTS.colorOverrideEnabled,
        baseColor: DEFAULTS.colorOverrideBaseColor,
        shadowColor: DEFAULTS.colorOverrideShadowColor,
        dilutionStrength: DEFAULTS.dilutionStrength,
        specularShininess: DEFAULTS.specularShininess,
        specularStrength: DEFAULTS.specularStrength,
        specularThreshold: DEFAULTS.specularThreshold,
      });
      setSobel({
        strength: DEFAULTS.sobelStrength,
        radius: DEFAULTS.sobelRadius,
      });
      setSubstrate({
        color: DEFAULTS.substrateColor,
        scale: DEFAULTS.substrateScale,
        showHeightMap: DEFAULTS.showSubstrateHeight,
      });
      setBlur({
        compositionBlurRadius: DEFAULTS.compositionBlurRadius,
        sobelBlurRadius: DEFAULTS.sobelBlurRadius,
      });
      setEdgeDarkening({ strength: DEFAULTS.edgeDarkening });
      setSubstrateFx({
        substrateDistortionEnabled: DEFAULTS.substrateDistortionEnabled,
        substrateDistortion: DEFAULTS.substrateDistortion,
        substrateLightingEnabled: DEFAULTS.substrateLightingEnabled,
        substrateLightAngle: DEFAULTS.substrateLightAngle,
        substrateLightStrength: DEFAULTS.substrateLightStrength,
        substrateRoughness: DEFAULTS.substrateRoughness,
      });
    }),
    'copy values': button(() => {
      navigator.clipboard?.writeText(JSON.stringify(valuesRef.current, null, 2));
    }),
  }));

  return {
    ...values,
    // The height toggle overrides the selected view with the substrate height map.
    debugView: substrate.showHeightMap ? 'substrate' : debug.view,
    debugChannel: debug.channel,
    showBoundingBoxes: debug['show bounding boxes'],
    colorOverrideEnabled: lighting.enabled,
    showSubstrateHeight: substrate.showHeightMap,
    setDebugView: (view) => setDebug({ view }),
  };
}
