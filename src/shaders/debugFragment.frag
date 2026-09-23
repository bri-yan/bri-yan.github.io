uniform sampler2D tInput;
uniform int uChannel; // 0 = rgb, 1 = alpha as grayscale, 2 = rgb × alpha
uniform int uMode; // 0 = color, 1 = raw depth, 2 = normalized depth, 3 = dilution, 4 = substrate
uniform float uNear;
uniform float uFar;
uniform int uShowSubstrateHeight;

varying vec2 vUv;

const float CHECKER_CELL_SIZE = 32.0;
const int RGB_CHANNEL = 0;
const int ALPHA_CHANNEL = 1;
const int PREMULTIPLIED_RGB_CHANNEL = 2;
const int COLOR_MODE = 0;
const int RAW_DEPTH_MODE = 1;
const int NORMALIZED_DEPTH_MODE = 2;
const int DILUTION_MODE = 3;
const int SUBSTRATE_MODE = 4;

vec3 checkerboard() {
  float checker = mod(
    floor(gl_FragCoord.x / CHECKER_CELL_SIZE) +
      floor(gl_FragCoord.y / CHECKER_CELL_SIZE),
    2.0
  );
  return vec3(checker * 0.125 + 0.125);
}

vec3 colorChannels(vec4 inputSample) {
  if (uChannel == RGB_CHANNEL) return inputSample.rgb;
  if (uChannel == ALPHA_CHANNEL) return vec3(inputSample.a);
  if (uChannel == PREMULTIPLIED_RGB_CHANNEL) return inputSample.rgb * inputSample.a;
  return inputSample.rgb;
}

float normalizedRawDepth(float depth) {
  return clamp((depth - uNear) / max(uFar - uNear, 0.0001), 0.0, 1.0);
}

void main() {
  vec4 inputSample = texture2D(tInput, vUv);
  vec3 checker = checkerboard();

  if (uMode == SUBSTRATE_MODE) {
    vec3 substrate = uShowSubstrateHeight == 1 ? vec3(inputSample.a) : inputSample.rgb;
    gl_FragColor = vec4(substrate, 1.0);
    return;
  }

  if (uMode == DILUTION_MODE) {
    gl_FragColor = inputSample.a <= 0.0
      ? vec4(checker, 1.0)
      : vec4(vec3(inputSample.a), 1.0);
    return;
  }

  if (inputSample.a < 0.5) {
    gl_FragColor = vec4(checker, 1.0);
    return;
  }

  if (uMode == RAW_DEPTH_MODE) {
    gl_FragColor = vec4(vec3(normalizedRawDepth(inputSample.r)), 1.0);
    return;
  }

  if (uMode == NORMALIZED_DEPTH_MODE) {
    gl_FragColor = vec4(vec3(clamp(inputSample.r, 0.0, 1.0)), 1.0);
    return;
  }

  gl_FragColor = vec4(colorChannels(inputSample), 1.0);
}
