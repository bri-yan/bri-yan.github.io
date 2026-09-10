uniform sampler2D tInput;
uniform vec2 uResolution;
uniform vec2 uDirection;
uniform float uRadius;
uniform float uPixelRatio;
varying vec2 vUv;
void main() {
  if (uRadius <= 0.0) { gl_FragColor = texture2D(tInput, vUv); return; }
  vec2 stepUv = uDirection * uRadius * uPixelRatio / (4.0 * uResolution);
  vec4 sum = vec4(0.0);
  float total = 0.0;
  for (int i = -8; i <= 8; i++) {
    float x = float(i) * 0.25;
    float weight = exp(-0.5 * x*x);
    sum += texture2D(tInput, vUv + float(i)*stepUv) * weight;
    total += weight;
  }
  gl_FragColor = sum / total;
}
