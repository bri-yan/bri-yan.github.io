import { useCallback, useRef } from 'react'
import { button, folder, useControls } from 'leva'
import { DEFAULTS, PASSES, SHAPES, STORAGE_KEY } from '../watercolor/settings'

const LIMITS = {
  shade: [0, 1], highlight: [0, 1], variation: [0, 1], controlVariation: [0, 1],
  ambientStrength: [0, 1], diffuseStrength: [0, 1], specularStrength: [0, 1],
  shininess: [1, 128], specularThreshold: [0, 1], specularSoftness: [0, 0.5],
  lightX: [-10, 10], lightY: [-10, 10], lightZ: [-10, 10],
  pigmentDensity: [0, 2], edgeStrength: [0, 4], edgeWidth: [0, 8],
  depthSensitivity: [0, 5], colorSensitivity: [0, 1], paperScale: [0.5, 12],
  paperRelief: [0, 0.5], granulation: [0, 1], dryBrush: [0, 1], distortion: [0, 2],
  bleedStrength: [0, 1], bleedRadius: [0, 8], depthThreshold: [0, 1], renderScale: [0.5, 2],
}

const COLOR = /^#[0-9a-f]{6}$/i
const PASS_OPTIONS = Object.fromEntries(PASSES.map(({ label, key }) => [label, key]))
const CHANNELS = { RGB: 'rgb', Alpha: 'alpha', 'RGB × alpha': 'rgb*a' }

function readSavedSettings() {
  let raw
  try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return { ...DEFAULTS } }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULTS }

  const clean = { ...DEFAULTS }
  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    const value = raw[key]
    if (key === 'shape' && Object.values(SHAPES).includes(value)) clean[key] = value
    else if (key === 'debugView' && PASSES.some((pass) => pass.key === value)) clean[key] = value
    else if (key === 'debugChannel' && Object.values(CHANNELS).includes(value)) clean[key] = value
    else if ((key === 'pigment' || key === 'paperColor') && typeof value === 'string' && COLOR.test(value)) clean[key] = value
    else if (typeof fallback === 'boolean' && typeof value === 'boolean') clean[key] = value
    else if (LIMITS[key] && typeof value === 'number' && Number.isFinite(value)) {
      clean[key] = Math.min(LIMITS[key][1], Math.max(LIMITS[key][0], value))
    }
  }
  return clean
}

const slider = (value, min, max, step = 0.01, label) => ({ value, min, max, step, label })

export function useWatercolorControls() {
  const initial = useRef(null)
  if (!initial.current) initial.current = readSavedSettings()
  const current = useRef(initial.current)
  const setter = useRef(null)

  const [settings, set] = useControls(() => ({
    Scene: folder({
      shape: { value: initial.current.shape, options: SHAPES, label: 'Shape' },
      rotate: { value: initial.current.rotate, label: 'Rotate' },
    }),
    Paint: folder({
      pigment: { value: initial.current.pigment, label: 'Pigment' },
      variation: slider(initial.current.variation, 0, 1, .01, 'Variation'),
      pigmentDensity: slider(initial.current.pigmentDensity, 0, 2, .01, 'Pigment density'),
      controlVariation: slider(initial.current.controlVariation, 0, 1, .01, 'Control variation'),
    }),
    Lighting: folder({
      shade: slider(initial.current.shade, 0, 1, .01, 'Diffuse amount'),
      ambientStrength: slider(initial.current.ambientStrength, 0, 1, .01, 'Ambient'),
      diffuseStrength: slider(initial.current.diffuseStrength, 0, 1, .01, 'Diffuse strength'),
      highlight: slider(initial.current.highlight, 0, 1, .01, 'Specular amount'),
      specularStrength: slider(initial.current.specularStrength, 0, 1, .01, 'Specular strength'),
      shininess: slider(initial.current.shininess, 1, 128, 1, 'Shininess'),
      specularThreshold: slider(initial.current.specularThreshold, 0, 1, .01, 'Highlight threshold'),
      specularSoftness: slider(initial.current.specularSoftness, 0, .5, .01, 'Highlight softness'),
      lightX: slider(initial.current.lightX, -10, 10, .1, 'Light X'),
      lightY: slider(initial.current.lightY, -10, 10, .1, 'Light Y'),
      lightZ: slider(initial.current.lightZ, -10, 10, .1, 'Light Z'),
    }),
    Edges: folder({
      edgeStrength: slider(initial.current.edgeStrength, 0, 4, .01, 'Strength'),
      edgeWidth: slider(initial.current.edgeWidth, 0, 8, .1, 'Width'),
      depthSensitivity: slider(initial.current.depthSensitivity, 0, 5, .01, 'Depth sensitivity'),
      colorSensitivity: slider(initial.current.colorSensitivity, 0, 1, .01, 'Color sensitivity'),
    }, { collapsed: true }),
    Paper: folder({
      paperColor: { value: initial.current.paperColor, label: 'Paper color' },
      paperScale: slider(initial.current.paperScale, .5, 12, .1, 'Scale'),
      paperRelief: slider(initial.current.paperRelief, 0, .5, .005, 'Relief'),
      granulation: slider(initial.current.granulation, 0, 1, .01, 'Granulation'),
      dryBrush: slider(initial.current.dryBrush, 0, 1, .01, 'Dry brush'),
      distortion: slider(initial.current.distortion, 0, 2, .01, 'Distortion'),
    }, { collapsed: true }),
    Bleeding: folder({
      bleedStrength: slider(initial.current.bleedStrength, 0, 1, .01, 'Strength'),
      bleedRadius: slider(initial.current.bleedRadius, 0, 8, .1, 'Radius'),
      depthThreshold: slider(initial.current.depthThreshold, 0, 1, .01, 'Depth threshold'),
    }, { collapsed: true }),
    Quality: folder({
      renderScale: slider(initial.current.renderScale, .5, 2, .25, 'Render scale'),
    }, { collapsed: true }),
    Debug: folder({
      debugView: { value: initial.current.debugView, options: PASS_OPTIONS, label: 'View' },
      debugChannel: { value: initial.current.debugChannel, options: CHANNELS, label: 'Channel' },
    }),
    Session: folder({
      'Save settings': button(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current.current)) } catch { /* storage can be unavailable */ }
      }),
      'Reset defaults': button(() => {
        try { localStorage.removeItem(STORAGE_KEY) } catch { /* storage can be unavailable */ }
        setter.current?.({ ...DEFAULTS })
      }),
    }, { collapsed: true }),
  }), [])

  current.current = settings
  setter.current = set
  const setDebugView = useCallback((debugView) => set({ debugView }), [set])
  return { settings, setDebugView }
}
