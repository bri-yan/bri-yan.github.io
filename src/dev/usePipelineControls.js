import { useMemo, useRef } from 'react';
import { button, useControls } from 'leva';
import * as THREE from 'three';
import { DEBUG_CHANNELS, DEBUG_VIEWS, DEFAULT_BACKGROUND_COLOR } from '../config';

const STORAGE_KEY = 'watercolor-pipeline-controls-v2';
const LEGACY_STORAGE_KEY = 'watercolor-pipeline-controls';
const DEFAULTS = {
  backgroundColor: `#${new THREE.Color(DEFAULT_BACKGROUND_COLOR).getHexString()}`,
};

function loadSaved() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
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
  }));

  const [output, setOutput] = useControls('Output', () => ({
    backgroundColor: saved.backgroundColor ?? DEFAULTS.backgroundColor,
  }));

  const values = { backgroundColor: output.backgroundColor };
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useControls('Session', () => ({
    save: button(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valuesRef.current));
    }),
    'reset to defaults': button(() => {
      localStorage.removeItem(STORAGE_KEY);
      setOutput(DEFAULTS);
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
