uniform sampler2D tIntensity;
uniform sampler2D tPaper;
uniform vec3 uBaseColor;
uniform float uBaseOpacity;  // c_α — Base Opacity
uniform float uThreshold;    // κ_ρ — Intensity Threshold
uniform float uWetness;      // κ_δ — Wetness/Transition Width
uniform float uEdgeDarkness; // κ_ε — Edge Darkness
uniform float uPaperWeight;  // κ_θ — Paper Weight

varying vec2 vUv;

void main() {
  // 
  float intensity = length(texture2D(tIntensity, vUv).rgb) / sqrt(3.0);
  float paperIntensity = length(texture2D(tPaper, vUv).rgb) / sqrt(3.0);
//   intensity = intensity == 0.0 ? 0.0 : clamp(intensity + (paperIntensity - 0.5) * 2.0, 0.0, 1.0);
  intensity = intensity * max(paperIntensity - 0.3, 0.0) / 0.3;

  // Calculate flow pattern opacity
  float min_opacity = max(0.0, uThreshold - uWetness);
  float max_opacity = min(1.0, uThreshold + uWetness);
  float opacity = uBaseOpacity * smoothstep(min_opacity, max_opacity, intensity);
  
  // Apply edge darkness
  opacity = opacity * (1.0 + uEdgeDarkness * (1.0 - intensity));

  vec4 result = vec4(uBaseColor * opacity, opacity);

  gl_FragColor = result;
}
