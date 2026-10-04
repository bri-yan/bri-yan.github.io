// One axis of a separable Gaussian blur of premultiplied color, so empty
// pixels never bleed. EdgeDarkeningPass builds each kernel on the CPU: the
// normalized center weight plus pairs of neighboring taps merged into one
// bilinear fetch each, (offset in texels along the axis, weight), mirrored.

const int MAX_BLUR_PAIRS = 16; // keep in sync with BLUR_MAX_TAPS / 2

vec4 blurAxis(sampler2D source, vec2 uv, vec2 axisTexel, float center, vec2 pairs[MAX_BLUR_PAIRS], int pairCount) {
  vec4 sum = center * texture2D(source, uv);
  for (int i = 0; i < MAX_BLUR_PAIRS; i++) {
    if (i >= pairCount) break;
    vec2 offset = pairs[i].x * axisTexel;
    sum += pairs[i].y * (texture2D(source, uv + offset) + texture2D(source, uv - offset));
  }
  return sum;
}
