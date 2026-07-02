uniform sampler2D tFlowPattern;
uniform sampler2D tDiffuse;
uniform sampler2D tSpecular;
uniform sampler2D tBlur;
uniform float uFlowPatternWeight;
uniform float uDiffuseWeight;
uniform float uSpecularWeight;
uniform float uBlurWeight;
uniform float uDiffuseGain;
uniform vec3 uBackgroundColor;

varying vec2 vUv;

void main() {
  vec4 flowPattern = texture2D(tFlowPattern, vUv) * uFlowPatternWeight;
  vec4 diffuse = texture2D(tDiffuse, vUv) * uDiffuseWeight;
  vec4 blur = texture2D(tBlur, vUv) * uBlurWeight;
  float specularMask = texture2D(tSpecular, vUv).a;

  // Watercolor layer shaded by the blurred inverse-light wash; uDiffuseGain
  // rescales diffuse.a (which peaks well below 1) toward full brightness.
  vec4 result = flowPattern * diffuse.a * uDiffuseGain + blur;

  // Specular highlights punch straight through the watercolor.
  if (specularMask > 0.5) result = vec4(uSpecularWeight);

  // flowPattern rgb is premultiplied by alpha, so composite over the
  // background with add + inverse-alpha rather than mix.
  result = clamp(result, 0.0, 1.0);
  gl_FragColor = vec4(result.rgb + uBackgroundColor * (1.0 - result.a), 1.0);
}
