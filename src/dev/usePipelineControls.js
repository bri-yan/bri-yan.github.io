import { useEffect, useMemo, useRef } from 'react';
import { button, folder, levaStore, useControls } from 'leva';
import {
  BOUNDS_VIEWS,
  DEBUG_CHANNELS,
  DEBUG_VIEWS,
  SUBSTRATE_VIEW,
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
  DEFAULT_TURBULENCE_INTENSITY,
  DEFAULT_TURBULENCE_OCTAVES,
  DEFAULT_TURBULENCE_SCALE,
  DEFAULT_TURBULENCE_WARP,
  DEFAULT_GRANULATION_INTENSITY,
  DEFAULT_DRY_BRUSH_AMOUNT,
  DEFAULT_DRY_BRUSH_SOFTNESS,
  DEFAULT_DRY_BRUSH_LIGHT_THRESHOLD,
  DEFAULT_DRY_BRUSH_LIGHT_SOFTNESS,
  TURBULENCE_MAX_OCTAVES,
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
  turbulenceIntensity: DEFAULT_TURBULENCE_INTENSITY,
  turbulenceScale: DEFAULT_TURBULENCE_SCALE,
  turbulenceOctaves: DEFAULT_TURBULENCE_OCTAVES,
  turbulenceWarp: DEFAULT_TURBULENCE_WARP,
  granulationIntensity: DEFAULT_GRANULATION_INTENSITY,
  dryBrushAmount: DEFAULT_DRY_BRUSH_AMOUNT,
  dryBrushSoftness: DEFAULT_DRY_BRUSH_SOFTNESS,
  dryBrushLightThreshold: DEFAULT_DRY_BRUSH_LIGHT_THRESHOLD,
  dryBrushLightSoftness: DEFAULT_DRY_BRUSH_LIGHT_SOFTNESS,
  edgeDarkening: DEFAULT_EDGE_DARKENING,
  substrateDistortionEnabled: true,
  substrateDistortion: DEFAULT_SUBSTRATE_DISTORTION,
  substrateLightingEnabled: true,
  substrateLightAngle: DEFAULT_SUBSTRATE_LIGHT_ANGLE,
  substrateLightStrength: DEFAULT_SUBSTRATE_LIGHT_STRENGTH,
  substrateRoughness: DEFAULT_SUBSTRATE_ROUGHNESS,
};

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

const pick = (source, keys) => Object.fromEntries(keys.map((key) => [key, source[key]]));
const slider = (saved, key, min, max, step, label) => ({
  ...(label && { label }),
  value: saved[key] ?? DEFAULTS[key],
  min,
  max,
  step,
});

/**
 * Leva controls for the active pipeline only: the Inspect tools first, then
 * folders grouped the way a painter thinks about the image (Light, Pigment,
 * Edges, Substrate), then the Session. Control keys match the pipeline prop
 * names, so each folder's values spread straight into the pipeline. Debug
 * views are derived from the shared pipeline definition; session actions
 * persist only live tunables.
 */
export function usePipelineControls() {
  const saved = useMemo(loadSaved, []);
  const initial = (key) => saved[key] ?? DEFAULTS[key];

  const [inspect, setInspect] = useControls('Inspect', () => ({
    view: { value: 'output', options: DEBUG_VIEWS, transient: false },
    channel: {
      value: 'rgb',
      options: DEBUG_CHANNELS,
      render: (get) => get('Inspect.view') === 'scene',
    },
  }));

  const [light, setLight] = useControls('Light', () => ({
    lightPosition: { label: 'position', value: initial('lightPosition') },
    Diffuse: folder({
      diffuseAmount: slider(saved, 'diffuseAmount', 0, 1, 0.01, 'diffuse intensity'),
    }),
    Specular: folder({
      specularShininess: slider(saved, 'specularShininess', 1, 128, 1, 'shininess'),
      specularStrength: slider(saved, 'specularStrength', 0, 1, 0.01, 'strength'),
      specularThreshold: slider(saved, 'specularThreshold', 0, 1, 0.01, 'threshold'),
    }),
  }));

  const [pigment, setPigment] = useControls('Pigment', () => ({
    colorOverrideEnabled: { label: 'override', value: initial('colorOverrideEnabled') },
    colorOverrideBaseColor: { label: 'base color', value: initial('colorOverrideBaseColor') },
    colorOverrideShadowColor: { label: 'shadow color', value: initial('colorOverrideShadowColor') },
    dilutionStrength: slider(saved, 'dilutionStrength', 0, 1, 0.01, 'dilution'),
    // Object-space Perlin fBm applied in diffuse composition; intensity 0 = off.
    Turbulence: folder({
      turbulenceIntensity: slider(saved, 'turbulenceIntensity', 0, 1, 0.01, 'intensity'),
      turbulenceScale: slider(saved, 'turbulenceScale', 0.25, 6, 0.05, 'scale'),
      turbulenceOctaves: slider(saved, 'turbulenceOctaves', 1, TURBULENCE_MAX_OCTAVES, 1, 'octaves'),
      turbulenceWarp: slider(saved, 'turbulenceWarp', 0, 3, 0.05, 'warp'),
    }),
    // Paper-height effects weighted by the light: granulation settles pigment
    // into the tooth in shadow; dry brush skips the peaks above a light threshold.
    Granulation: folder({
      granulationIntensity: slider(saved, 'granulationIntensity', 0, 1, 0.01, 'intensity'),
    }),
    'Dry brush': folder({
      dryBrushAmount: slider(saved, 'dryBrushAmount', 0, 1, 0.01, 'amount'),
      dryBrushLightThreshold: slider(saved, 'dryBrushLightThreshold', 0, 1, 0.01, 'threshold'),
      dryBrushSoftness: slider(saved, 'dryBrushSoftness', 0.01, 0.3, 0.01, 'softness'),
      dryBrushLightSoftness: slider(saved, 'dryBrushLightSoftness', 0.01, 0.3, 0.01, 'transition'),
    }),
    // CSS pixels; 0 passes the paint through unblurred.
    Wetness: folder({
      compositionBlurRadius: slider(saved, 'compositionBlurRadius', 0, BLUR_MAX_RADIUS, 0.5, 'paint blur'),
    }),
  }));

  // Width is the sobel blur radius (the thesis's W, CSS px); darkening 0 = off.
  const [edges, setEdges] = useControls('Edges', () => ({
    edgeDarkening: slider(saved, 'edgeDarkening', 0, 5, 0.05, 'darkening'),
    sobelBlurRadius: slider(saved, 'sobelBlurRadius', 0, BLUR_MAX_RADIUS, 0.5, 'width'),
    Detection: folder({
      sobelStrength: slider(saved, 'sobelStrength', 0, 4, 0.01, 'sobel strength'),
      sobelRadius: slider(saved, 'sobelRadius', 1, 6, 1, 'sobel radius'),
      showBoundingBoxes: { label: 'bounding boxes', value: initial('showBoundingBoxes') },
    }),
  }));

  // Each effect toggles independently; its settings show only while it is on.
  const [substrate, setSubstrate] = useControls('Substrate', () => ({
    showSubstrateHeight: { label: 'height map', value: initial('showSubstrateHeight') },
    substrateColor: { label: 'color', value: initial('substrateColor') },
    substrateScale: slider(saved, 'substrateScale', 0.5, 12, 0.1, 'scale'),
    Distortion: folder({
      substrateDistortionEnabled: { label: 'enabled', value: initial('substrateDistortionEnabled') },
      substrateDistortion: {
        ...slider(saved, 'substrateDistortion', 0, 8, 0.1, 'amount'),
        render: (get) => get('Substrate.Distortion.substrateDistortionEnabled'),
      },
    }),
    Lighting: folder({
      substrateLightingEnabled: { label: 'enabled', value: initial('substrateLightingEnabled') },
      substrateLightAngle: {
        ...slider(saved, 'substrateLightAngle', 0, 360, 1, 'angle'),
        render: (get) => get('Substrate.Lighting.substrateLightingEnabled'),
      },
      substrateLightStrength: {
        ...slider(saved, 'substrateLightStrength', 0, 1, 0.01, 'strength'),
        render: (get) => get('Substrate.Lighting.substrateLightingEnabled'),
      },
      substrateRoughness: {
        ...slider(saved, 'substrateRoughness', 0, 4, 0.05, 'roughness'),
        render: (get) => get('Substrate.Lighting.substrateLightingEnabled'),
      },
    }),
  }));

  // View-specific toggles stay in the panel but can't be flipped until the
  // view they act on is showing.
  useEffect(() => {
    const enabledAt = {
      'Edges.Detection.showBoundingBoxes': BOUNDS_VIEWS.has(inspect.view),
      'Substrate.showSubstrateHeight': inspect.view === SUBSTRATE_VIEW,
    };
    for (const [path, enabled] of Object.entries(enabledAt)) levaStore.disableInputAtPath(path, !enabled);
  }, [inspect.view]);

  const values = { ...light, ...pigment, ...edges, ...substrate };
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useControls('Session', () => ({
    save: button(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valuesRef.current));
    }),
    'reset to defaults': button(() => {
      localStorage.removeItem(STORAGE_KEY);
      setLight(pick(DEFAULTS, Object.keys(light)));
      setPigment(pick(DEFAULTS, Object.keys(pigment)));
      setEdges(pick(DEFAULTS, Object.keys(edges)));
      setSubstrate(pick(DEFAULTS, Object.keys(substrate)));
    }),
    'copy values': button(() => {
      navigator.clipboard?.writeText(JSON.stringify(valuesRef.current, null, 2));
    }),
  }));

  return {
    ...values,
    debugView: inspect.view,
    debugChannel: inspect.channel,
    setDebugView: (view) => setInspect({ view }),
  };
}
