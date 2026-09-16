uniform sampler2D tInput;
uniform vec2 uTexelSize;

varying vec2 vUv;

void addSample(vec4 sampleValue, inout float minDepth, inout float maxDepth, inout float coverage) {
  if (sampleValue.a < 0.5) return;
  minDepth = min(minDepth, sampleValue.r);
  maxDepth = max(maxDepth, sampleValue.g);
  coverage = 1.0;
}

void main() {
  vec2 base = vUv - 0.5 * uTexelSize;
  float minDepth = 65504.0;
  float maxDepth = 0.0;
  float coverage = 0.0;
  addSample(texture2D(tInput, base), minDepth, maxDepth, coverage);
  addSample(texture2D(tInput, base + vec2(uTexelSize.x, 0.0)), minDepth, maxDepth, coverage);
  addSample(texture2D(tInput, base + vec2(0.0, uTexelSize.y)), minDepth, maxDepth, coverage);
  addSample(texture2D(tInput, base + uTexelSize), minDepth, maxDepth, coverage);
  gl_FragColor = coverage > 0.5 ? vec4(minDepth, maxDepth, 0.0, 1.0) : vec4(0.0);
}
