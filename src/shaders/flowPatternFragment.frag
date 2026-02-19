uniform sampler2D tIntensity;
uniform float uThreshold;   // κ_ρ — Intensity Threshold
uniform float uWetness; // κ_δ — Wetness/Transition Width
uniform float uBaseOpacity;     // c_α — Base Opacity

varying vec2 vUv;

void main() {
  vec3 intensity = texture2D(tIntensity, vUv).rgb;
  float cur_opacity = texture2D(tIntensity, vUv).a;
  float opacity = uBaseOpacity * smoothstep(uThreshold - uWetness, uThreshold + uWetness, length(intensity));

  vec4 result = vec4(opacity, opacity, opacity, opacity);
  gl_FragColor = result;
}
