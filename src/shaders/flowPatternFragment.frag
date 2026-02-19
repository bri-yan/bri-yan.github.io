uniform sampler2D tIntensity;
uniform float uBaseOpacity;  // c_α — Base Opacity
uniform float uThreshold;    // κ_ρ — Intensity Threshold
uniform float uWetness;      // κ_δ — Wetness/Transition Width
uniform float uEdgeDarkness; // κ_ε — Edge Darkness

varying vec2 vUv;

void main() {
  float intensity = length(texture2D(tIntensity, vUv).rgb);

  // Calculate flow pattern opacity
  float min_opacity = max(0.0, uThreshold - uWetness);
  float max_opacity = min(1.0, uThreshold + uWetness);
  float opacity = uBaseOpacity * smoothstep(min_opacity, max_opacity, intensity);
  
  // Apply edge darkness
  opacity = opacity * (1.0 + uEdgeDarkness * (1.0 - intensity));

  vec4 result = vec4(opacity, opacity, opacity, opacity);
  gl_FragColor = result;
}
