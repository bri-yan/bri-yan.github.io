uniform sampler2D tFlowPattern;
uniform sampler2D tDiffuse;
uniform sampler2D tSpecular;
uniform sampler2D tBlur;
uniform sampler2D tPaper;
uniform float uFlowPatternWeight;
uniform float uDiffuseWeight;
uniform float uSpecularWeight;
uniform float uBlurWeight;
uniform float uPaperWeight;
uniform float uBlendMode; // 0 = additive, 1 = multiply, 2 = screen
uniform float uShowPaper; // debug: 1 = output raw paper FBO
uniform vec3 uBackgroundColor;

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
  vec4 flowPattern = texture2D(tFlowPattern, vUv) * uFlowPatternWeight;
  vec4 diffuse = texture2D(tDiffuse, vUv) * uDiffuseWeight;
  vec4 specular = texture2D(tSpecular, vUv) * uSpecularWeight;
  vec4 blur = texture2D(tBlur, vUv) * uBlurWeight;
  vec4 paper = texture2D(tPaper, vUv);

  if (uShowPaper > 0.5) {
    gl_FragColor = paper;
    return;
  }

  vec4 result = flowPattern * diffuse.a * 2.5 + blur;
  result = specular.a == 1.0 ? specular : result;
  gl_FragColor = result;
}
