import { useMemo, useRef } from 'react';
import { button, useControls } from 'leva';
import * as THREE from 'three';
import {
  DEBUG_VIEWS,
  DEBUG_CHANNELS,
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

const STORAGE_KEY = 'watercolor-pipeline-controls';

const hex = (color) => `#${new THREE.Color(color).getHexString()}`;

/** Tuning defaults keyed by the flat prop names MultiPassPipeline expects (Debug excluded). */
const DEFAULTS = {
  paintBaseColor: hex(DEFAULT_PAINT_BASE_COLOR),
  paintThreshold: DEFAULT_PAINT_THRESHOLD,
  paintWetness: DEFAULT_PAINT_WETNESS,
  edgeWeight: DEFAULT_EDGE_WEIGHT,
  edgePaperWeight: DEFAULT_EDGE_PAPER_WEIGHT,
  edgeSharpness: DEFAULT_EDGE_SHARPNESS,
  edgeDarkness: DEFAULT_EDGE_DARKNESS,
  bodyWeight: DEFAULT_BODY_WEIGHT,
  bodyPaperWeight: DEFAULT_BODY_PAPER_WEIGHT,
  bodyOpacity: DEFAULT_BODY_OPACITY,
  blurIterations: DEFAULT_BLUR_ITERATIONS,
  blurStrength: DEFAULT_BLUR_STRENGTH,
  lightingLightPosition: DEFAULT_BLINN_PHONG_LIGHT_POSITION,
  lightingShininess: DEFAULT_BLINN_PHONG_SHININESS,
  lightingAmbientStrength: DEFAULT_BLINN_PHONG_AMBIENT_STRENGTH,
  lightingDiffuseStrength: DEFAULT_BLINN_PHONG_DIFFUSE_STRENGTH,
  lightingSpecularStrength: DEFAULT_BLINN_PHONG_SPECULAR_STRENGTH,
  lightingSpecularThreshold: DEFAULT_BLINN_PHONG_SPECULAR_THRESHOLD,
  diffuseWeight: DEFAULT_DIFFUSE_WEIGHT,
  specularWeight: DEFAULT_SPECULAR_WEIGHT,
  blurWeight: DEFAULT_BLUR_WEIGHT,
  diffuseGain: DEFAULT_COMPOSITOR_DIFFUSE_GAIN,
  backgroundColor: hex(DEFAULT_COMPOSITOR_BACKGROUND),
  paperRepeatX: DEFAULT_PAPER_REPEAT_X,
  paperRepeatY: DEFAULT_PAPER_REPEAT_Y,
};

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

/**
 * Dev console: leva panel exposing every pipeline tunable, initialized from
 * config/constants.js (or the last saved state — see the Session folder).
 * Returns a flat object shaped like MultiPassPipeline's props, plus
 * setDebugView(view) for external control of the debug view (the diagram).
 *
 * Session folder: "save" persists current values to localStorage so they
 * survive refresh; "reset to defaults" restores constants.js values and
 * clears the save; "copy values" puts the values JSON on the clipboard.
 */
export function usePipelineControls() {
  const saved = useMemo(loadSaved, []);
  // Schemas are created once (function form), so init reads are one-shot too.
  const init = (key) => saved[key] ?? DEFAULTS[key];

  const [debug, setDebug] = useControls('Debug', () => ({
    view: { value: 'final', options: DEBUG_VIEWS },
    channel: { value: 'rgb', options: DEBUG_CHANNELS },
  }));

  const [paint, setPaint] = useControls('Paint', () => ({
    baseColor: init('paintBaseColor'),
    threshold: { value: init('paintThreshold'), min: 0, max: 1, step: 0.01 },
    wetness: { value: init('paintWetness'), min: 0, max: 1, step: 0.01 },
  }));

  const [edge, setEdge] = useControls('Edge', () => ({
    paperWeight: { value: init('edgePaperWeight'), min: 0, max: 1.5, step: 0.01 },
    sharpness: { value: init('edgeSharpness'), min: 1, max: 200, step: 1 },
    // Reserved: plumbed to the shader but not yet used by it.
    darkness: { value: init('edgeDarkness'), min: 0, max: 1, step: 0.01 },
  }));

  const [body, setBody] = useControls('Body', () => ({
    paperWeight: { value: init('bodyPaperWeight'), min: 0, max: 1, step: 0.01 },
    // Reserved: plumbed to the shader but not yet used by it.
    opacity: { value: init('bodyOpacity'), min: 0, max: 1, step: 0.01 },
  }));

  const [blur, setBlur] = useControls('Blur', () => ({
    iterations: { value: init('blurIterations'), min: 1, max: 10, step: 1 },
    strength: { value: init('blurStrength'), min: 0, max: 3, step: 0.05 },
  }));

  const [lighting, setLighting] = useControls('Lighting', () => ({
    lightPosition: { value: init('lightingLightPosition') },
    shininess: { value: init('lightingShininess'), min: 1, max: 128, step: 1 },
    ambientStrength: { value: init('lightingAmbientStrength'), min: 0, max: 1, step: 0.01 },
    diffuseStrength: { value: init('lightingDiffuseStrength'), min: 0, max: 1, step: 0.01 },
    specularStrength: { value: init('lightingSpecularStrength'), min: 0, max: 1, step: 0.01 },
    specularThreshold: {
      value: init('lightingSpecularThreshold'),
      min: 0,
      max: 1,
      step: 0.01,
    },
  }));

  const [compositor, setCompositor] = useControls('Compositor', () => ({
    edgeWeight: { value: init('edgeWeight'), min: 0, max: 2, step: 0.05 },
    bodyWeight: { value: init('bodyWeight'), min: 0, max: 2, step: 0.05 },
    diffuseWeight: { value: init('diffuseWeight'), min: 0, max: 2, step: 0.05 },
    specularWeight: { value: init('specularWeight'), min: 0, max: 2, step: 0.05 },
    blurWeight: { value: init('blurWeight'), min: 0, max: 2, step: 0.05 },
    diffuseGain: { value: init('diffuseGain'), min: 0, max: 5, step: 0.05 },
    backgroundColor: init('backgroundColor'),
  }));

  const [paper, setPaper] = useControls('Paper', () => ({
    repeatX: { value: init('paperRepeatX'), min: 0.25, max: 8, step: 0.25 },
    repeatY: { value: init('paperRepeatY'), min: 0.25, max: 8, step: 0.25 },
  }));

  const values = {
    paintBaseColor: paint.baseColor,
    paintThreshold: paint.threshold,
    paintWetness: paint.wetness,
    edgeWeight: compositor.edgeWeight,
    edgePaperWeight: edge.paperWeight,
    edgeSharpness: edge.sharpness,
    edgeDarkness: edge.darkness,
    bodyWeight: compositor.bodyWeight,
    bodyPaperWeight: body.paperWeight,
    bodyOpacity: body.opacity,
    blurIterations: blur.iterations,
    blurStrength: blur.strength,
    lightingLightPosition: lighting.lightPosition,
    lightingShininess: lighting.shininess,
    lightingAmbientStrength: lighting.ambientStrength,
    lightingDiffuseStrength: lighting.diffuseStrength,
    lightingSpecularStrength: lighting.specularStrength,
    lightingSpecularThreshold: lighting.specularThreshold,
    diffuseWeight: compositor.diffuseWeight,
    specularWeight: compositor.specularWeight,
    blurWeight: compositor.blurWeight,
    diffuseGain: compositor.diffuseGain,
    backgroundColor: compositor.backgroundColor,
    paperRepeatX: paper.repeatX,
    paperRepeatY: paper.repeatY,
  };

  // Session buttons are created once with the schema; they read live values
  // through this ref instead of a (stale) closure.
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useControls('Session', () => ({
    save: button(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valuesRef.current));
    }),
    'reset to defaults': button(() => {
      localStorage.removeItem(STORAGE_KEY);
      setPaint({
        baseColor: DEFAULTS.paintBaseColor,
        threshold: DEFAULTS.paintThreshold,
        wetness: DEFAULTS.paintWetness,
      });
      setEdge({
        paperWeight: DEFAULTS.edgePaperWeight,
        sharpness: DEFAULTS.edgeSharpness,
        darkness: DEFAULTS.edgeDarkness,
      });
      setBody({ paperWeight: DEFAULTS.bodyPaperWeight, opacity: DEFAULTS.bodyOpacity });
      setBlur({ iterations: DEFAULTS.blurIterations, strength: DEFAULTS.blurStrength });
      setLighting({
        lightPosition: DEFAULTS.lightingLightPosition,
        shininess: DEFAULTS.lightingShininess,
        ambientStrength: DEFAULTS.lightingAmbientStrength,
        diffuseStrength: DEFAULTS.lightingDiffuseStrength,
        specularStrength: DEFAULTS.lightingSpecularStrength,
        specularThreshold: DEFAULTS.lightingSpecularThreshold,
      });
      setCompositor({
        edgeWeight: DEFAULTS.edgeWeight,
        bodyWeight: DEFAULTS.bodyWeight,
        diffuseWeight: DEFAULTS.diffuseWeight,
        specularWeight: DEFAULTS.specularWeight,
        blurWeight: DEFAULTS.blurWeight,
        diffuseGain: DEFAULTS.diffuseGain,
        backgroundColor: DEFAULTS.backgroundColor,
      });
      setPaper({ repeatX: DEFAULTS.paperRepeatX, repeatY: DEFAULTS.paperRepeatY });
    }),
    'copy values': button(() => {
      navigator.clipboard?.writeText(JSON.stringify(valuesRef.current, null, 2));
    }),
  }));

  return {
    ...values,
    debugView: debug.view,
    debugChannel: debug.channel,
    setDebugView: (view) => setDebug({ view }),
  };
}
