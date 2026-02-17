uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uBlurStrength;

varying vec2 vUv;

const float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

void main() {
  vec2 texelSize = 1.0 / uResolution;
  vec3 result = texture2D(tDiffuse, vUv).rgb * weights[0];

  for (int i = 1; i < 5; i++) {
    float offset = float(i) * uBlurStrength;
    result += texture2D(tDiffuse, vUv + vec2(texelSize.x * offset, 0.0)).rgb * weights[i];
    result += texture2D(tDiffuse, vUv - vec2(texelSize.x * offset, 0.0)).rgb * weights[i];
  }

  gl_FragColor = vec4(result, 1.0);
}
