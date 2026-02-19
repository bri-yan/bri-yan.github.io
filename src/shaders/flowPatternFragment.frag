uniform sampler2D tIntensity;
uniform float uThreshold;   // κ_ρ — Intensity Threshold
uniform float uWetness; // κ_δ — Wetness/Transition Width
uniform float uBaseOpacity;     // c_α — Base Opacity

varying vec2 vUv;

void main() {
  vec3 intensity = texture2D(tIntensity, vUv).rgb;
  float min_opacity = max(0.0, uThreshold - uWetness);
  float max_opacity = min(1.0, uThreshold + uWetness);
  float opacity = uBaseOpacity * smoothstep(min_opacity, max_opacity, length(intensity));
  
  vec4 result = vec4(opacity, opacity, opacity, 1.0);
  gl_FragColor = result;
}
