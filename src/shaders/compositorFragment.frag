uniform sampler2D tFlowPattern;
uniform sampler2D tBlinnPhong;
uniform sampler2D tBlur;
uniform float uFlowPatternWeight;
uniform float uBlinnPhongWeight;
uniform float uBlurWeight;
uniform float uBlendMode; // 0 = additive, 1 = multiply, 2 = screen

varying vec2 vUv;

vec3 blendAdditive(vec3 a, vec3 b) {
  return a + b;
}

vec3 blendMultiply(vec3 a, vec3 b) {
  return a * b;
}

vec3 blendScreen(vec3 a, vec3 b) {
  return 1.0 - (1.0 - a) * (1.0 - b);
}

void main() {
  vec3 flowPattern = texture2D(tFlowPattern, vUv).rgb * uFlowPatternWeight;
  vec3 blinnPhong = texture2D(tBlinnPhong, vUv).rgb * uBlinnPhongWeight;
  vec3 blur = texture2D(tBlur, vUv).rgb * uBlurWeight;

  // Blend lit passes based on mode, then add flow pattern
  vec3 blended;
  if (uBlendMode < 0.5) {
    blended = blendAdditive(blinnPhong, blur);
  } else if (uBlendMode < 1.5) {
    blended = blendMultiply(blinnPhong, blur);
  } else {
    blended = blendScreen(blinnPhong, blur);
  }

  vec3 result = flowPattern + blended;
  gl_FragColor = vec4(result, 1.0);
}
