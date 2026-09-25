// One 1-D pass of a separable Gaussian blur. BlurPass runs it horizontally,
// then vertically, blurring premultiplied color so empty pixels never bleed.

uniform sampler2D tInput;
uniform vec2 uStep; // UV offset between taps along the blur axis
uniform float uSigma; // Gaussian sigma, in taps
uniform int uTaps; // taps on each side of the center; 0 = passthrough
uniform bool uPremultiplyInput;
uniform bool uUnpremultiplyOutput;

varying vec2 vUv;

const int MAX_TAPS = 32;

vec4 premultipliedAt(vec2 uv) {
  vec4 inputSample = texture2D(tInput, uv);
  if (uPremultiplyInput) inputSample.rgb *= inputSample.a;
  return inputSample;
}

void main() {
  vec4 sum = premultipliedAt(vUv);
  float weightSum = 1.0;

  for (int i = 1; i <= MAX_TAPS; i++) {
    if (i > uTaps) break;
    float weight = exp(-0.5 * float(i * i) / (uSigma * uSigma));
    vec2 offset = uStep * float(i);
    sum += weight * (premultipliedAt(vUv + offset) + premultipliedAt(vUv - offset));
    weightSum += 2.0 * weight;
  }

  vec4 blurred = sum / weightSum;
  if (uUnpremultiplyOutput) blurred.rgb = blurred.a > 0.0 ? blurred.rgb / blurred.a : vec3(0.0);
  gl_FragColor = blurred;
}
