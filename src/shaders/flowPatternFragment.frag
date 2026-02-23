uniform sampler2D tIntensity;
uniform sampler2D tPaper;
uniform vec3 uBaseColor;
uniform float uBaseOpacity;  // c_α — Base Opacity
uniform float uThreshold;    // κ_ρ — Intensity Threshold
uniform float uWetness;      // κ_δ — Wetness/Transition Width
uniform float uEdgeDarkness;   // κ_ε — Edge Darkness
uniform float uPaperWeight;    // κ_θ — Paper Weight
uniform float uEdgeSharpness;  // Gradient-based edge detection scale

varying vec2 vUv;

void main() {
  float intensity = length(texture2D(tIntensity, vUv).rgb) / sqrt(3.0);
  float paperIntensity = length(texture2D(tPaper, vUv).rgb) / sqrt(3.0);
  
  intensity = smoothstep(max(0.0, uThreshold - uWetness), min(1.0, uThreshold + uWetness), intensity);
  float texturedIntensity = intensity * (1.0 + uPaperWeight*(paperIntensity - 0.5) / 0.5);


  float edgeThickness = 0.2;
  float inverseIntensity = 1.0 - texturedIntensity;
  float meshMask = texturedIntensity > edgeThickness ? 1.0 : 0.0;
  float edge = meshMask * inverseIntensity * 1.5;

  float finalIntensity = edge + texturedIntensity * 0.2;
//   x = (1.0 - x) * meshMask;

  vec4 result = vec4(uBaseColor, finalIntensity);

  gl_FragColor = result;
}
