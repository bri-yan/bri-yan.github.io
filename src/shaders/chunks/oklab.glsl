// OKLab pigment concentration shared by edge darkening and pigment turbulence.
// Concentrated pigment reads as the same hue, darker and richer: OKLab
// lightness drops and chroma rises, as far as sRGB allows.

const float MAX_DARKENING = 0.3; // fraction of OKLab lightness removed at full concentration
const float MAX_RICHNESS = 0.35; // fraction of chroma added at full concentration

// mix() evaluates both branches, so pow() inputs are kept non-negative: a NaN
// in the unused branch still poisons the result (NaN × 0 = NaN).
vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow(max((c + 0.055) / 1.055, 0.0), vec3(2.4)), step(0.04045, c));
}

vec3 linearToSrgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

// Björn Ottosson's OKLab.
vec3 linearToOklab(vec3 c) {
  vec3 lms = mat3(
    0.4122214708, 0.2119034982, 0.0883024619,
    0.5363325363, 0.6806995451, 0.2817188376,
    0.0514459929, 0.1073969566, 0.6299787005
  ) * c;
  return mat3(
    0.2104542553, 1.9779984951, 0.0259040371,
    0.7936177850, -2.4285922050, 0.7827717662,
    -0.0040720468, 0.4505937099, -0.8086757660
  ) * pow(max(lms, 0.0), vec3(1.0 / 3.0));
}

vec3 oklabToLinear(vec3 lab) {
  vec3 lms = mat3(
    1.0, 1.0, 1.0,
    0.3963377774, -0.1055613458, -0.0894841775,
    0.2158037573, -0.0638541728, -1.2914855480
  ) * lab;
  return mat3(
    4.0767416621, -1.2684380046, -0.0041960863,
    -3.3077115913, 2.6097574011, -0.5618207050,
    0.2309699292, -0.3413193965, 1.7015636624
  ) * (lms * lms * lms);
}

bool inGamut(vec3 c) {
  return all(greaterThanEqual(c, vec3(-1e-4))) && all(lessThanEqual(c, vec3(1.0 + 1e-4)));
}

// Keeps lightness and hue, backing chroma off until the color fits in sRGB;
// clamping channels instead would shift the hue toward the strongest one.
vec3 gamutMap(vec3 lab) {
  vec3 color = oklabToLinear(lab);
  if (inGamut(color)) return clamp(color, 0.0, 1.0);
  float low = 0.0;
  float high = 1.0;
  for (int i = 0; i < 8; i++) {
    float mid = 0.5 * (low + high);
    if (inGamut(oklabToLinear(vec3(lab.x, lab.yz * mid)))) low = mid;
    else high = mid;
  }
  return clamp(oklabToLinear(vec3(lab.x, lab.yz * low)), 0.0, 1.0);
}

// amount in [0, 1]: 0 leaves the color unchanged, 1 is full concentration.
vec3 concentratePigment(vec3 rgb, float amount) {
  vec3 lab = linearToOklab(srgbToLinear(rgb));
  lab.x *= 1.0 - MAX_DARKENING * amount;
  lab.yz *= 1.0 + MAX_RICHNESS * amount;
  return linearToSrgb(gamutMap(lab));
}
