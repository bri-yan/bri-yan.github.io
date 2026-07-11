// One 1-D pass of a separable 9-tap Gaussian blur along uDirection
// ((1,0) = horizontal, (0,1) = vertical). Run twice for a full 2-D blur.

uniform sampler2D tInput;
uniform vec2 uResolution;
uniform vec2 uDirection;
uniform float uBlurStrength; // scales the per-tap offset (wider = softer)

varying vec2 vUv;

const float WEIGHTS[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

void main() {
  vec2 texelStep = uDirection * uBlurStrength / uResolution;
  vec4 result = texture2D(tInput, vUv) * WEIGHTS[0];

  for (int i = 1; i < 5; i++) {
    vec2 offset = texelStep * float(i);
    result += texture2D(tInput, vUv + offset) * WEIGHTS[i];
    result += texture2D(tInput, vUv - offset) * WEIGHTS[i];
  }

  gl_FragColor = result;
}
