export const DEFAULTS = {
  shape: 'torus', rotate: false,
  pigment: '#387f91', paperColor: '#f7f3e9',
  shade: 0.55, highlight: 0.3, variation: 0.22, controlVariation: 0.35,
  ambientStrength: 0.2, diffuseStrength: 0.7,
  specularStrength: 0.7, shininess: 32, specularThreshold: 0.3, specularSoftness: 0.08,
  lightX: -3, lightY: 5, lightZ: 5,
  edgeStrength: 1.5, edgeWidth: 3, depthSensitivity: 1.8, colorSensitivity: 0.2,
  pigmentDensity: 0.85, granulation: 0.3, dryBrush: 0.08,
  paperScale: 3, paperRelief: 0.14,
  bleedStrength: 0.18, bleedRadius: 3, depthThreshold: 0.12,
  distortion: 0.5, renderScale: 1,
  debugView: 'final', debugChannel: 'rgb',
};

export const SHAPES = {
  Torus: 'torus', 'Torus knot': 'torusKnot', Sphere: 'sphere',
  Box: 'box', Cylinder: 'cylinder', Cone: 'cone', 'Overlapping shapes': 'overlap',
};

export const PASSES = [
  { key: 'diffuse', label: 'Diffuse wash', description: 'Inverse Lambert signal: bright in shadow, dark toward the light. The wash uses this to keep pigment in shadows and dilute lit areas.' },
  { key: 'specular', label: 'Specular highlights', description: 'A Blinn–Phong reflection stencil. Shininess controls its size; threshold and softness shape its boundary. It dilutes pigment without changing coverage.' },
  { key: 'wash', label: 'Color wash', description: 'The complete shape, shaded with pigment color. Alpha records where paint exists.' },
  { key: 'depth', label: 'Depth', description: 'Distance from the camera separates the object from the paper and reveals overlapping surfaces.' },
  { key: 'controls', label: 'Local controls', description: 'Object-attached variation: red controls edges, green pigment, and blue wetness.' },
  { key: 'edges', label: 'Detected edges', description: 'Color and depth changes locate both outlines and overlapping surfaces.' },
  { key: 'edgeSpread', label: 'Edge spread', description: 'A Gaussian filter widens the edge signal into a gradual band of pigment concentration.' },
  { key: 'paper', label: 'Paper height', description: 'A stationary paper surface: bright peaks and dark valleys affect how paint settles.' },
  { key: 'pigment', label: 'Pigment', description: 'Darkens the wash at edges and in paper valleys; dry brushing leaves peaks exposed.' },
  { key: 'bleeding', label: 'Color bleeding', description: 'A depth-aware filter lets wet color spread while guarding foreground surfaces.' },
  { key: 'surface', label: 'Paper surface', description: 'Paper slopes gently distort the paint and catch light.' },
  { key: 'final', label: 'Final painting', description: 'Paint over warm paper, converted to display color once.' },
];

export const STORAGE_KEY = 'astra-watercolor-controls-v1';
