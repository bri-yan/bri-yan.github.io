import { useMemo, useRef } from 'react';
import { button, folder, useControls } from 'leva';
import * as THREE from 'three';
import {
  DEBUG_CHANNELS,
  DEBUG_VIEWS,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_COLOR_OVERRIDE_BASE_COLOR,
  DEFAULT_COLOR_OVERRIDE_SHADOW_COLOR,
  DEFAULT_DIFFUSE_AMOUNT,
  DEFAULT_DILUTION_STRENGTH,
  DEFAULT_LIGHT_POSITION,
  DEFAULT_SPECULAR_SHININESS,
  DEFAULT_SPECULAR_STRENGTH,
  DEFAULT_SPECULAR_THRESHOLD,
} from '../config';

const STORAGE_KEY = 'watercolor-pipeline-controls-v2';
const LEGACY_STORAGE_KEY = 'watercolor-pipeline-controls';
const DEFAULTS = {
  backgroundColor: `#${new THREE.Color(DEFAULT_BACKGROUND_COLOR).getHexString()}`,
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

/**
 * Leva controls for the active pipeline only. Debug views are derived from the
 * shared pipeline definition; session actions persist only live tunables.
 */
export function usePipelineControls() {
  const saved = useMemo(loadSaved, []);

  const [debug, setDebug] = useControls('Debug', () => ({
    view: { value: 'output', options: DEBUG_VIEWS },
    channel: {
      value: 'rgb',
      options: DEBUG_CHANNELS,
      render: (get) => get('Debug.view') === 'color',
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

  const [output, setOutput] = useControls('Output', () => ({
    backgroundColor: saved.backgroundColor ?? DEFAULTS.backgroundColor,
  }));

  const values = {
    backgroundColor: output.backgroundColor,
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
  };
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useControls('Session', () => ({
    save: button(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valuesRef.current));
    }),
    'reset to defaults': button(() => {
      localStorage.removeItem(STORAGE_KEY);
      setOutput({ backgroundColor: DEFAULTS.backgroundColor });
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
    }),
    'copy values': button(() => {
      navigator.clipboard?.writeText(JSON.stringify(valuesRef.current, null, 2));
    }),
  }));

  return {
    ...values,
    debugView: debug.view,
    debugChannel: debug.channel,
    showBoundingBoxes: debug['show bounding boxes'],
    colorOverrideEnabled: lighting.enabled,
    setDebugView: (view) => setDebug({ view }),
  };
}
