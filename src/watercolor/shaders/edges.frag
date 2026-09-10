uniform sampler2D tWash;
uniform sampler2D tGeometry;
uniform vec2 uResolution;
uniform float uFar;
uniform float uDepthSensitivity;
uniform float uColorSensitivity;
varying vec2 vUv;

vec4 edgeInput(vec2 uv) {
  vec4 paint = texture2D(tWash, uv);
  vec3 pigment = paint.a > 0.00001 ? paint.rgb / paint.a : vec3(1.0);
  float depth = texture2D(tGeometry, uv).a * uFar;
  // Empty paper has white reflectance. Limit distant background jumps to
  // keep silhouettes and inner occlusions in a comparable signal range.
  float centerDepth = texture2D(tGeometry, vUv).a * uFar;
  depth = clamp(depth - centerDepth, -1.0, 1.0);
  return vec4(mix(vec3(1.0), pigment, paint.a) * uColorSensitivity,
              depth * uDepthSensitivity);
}
void main() {
  vec2 p = 1.0 / uResolution;
  vec4 a = edgeInput(vUv + p * vec2(-1.0, 1.0));
  vec4 b = edgeInput(vUv + p * vec2( 0.0, 1.0));
  vec4 c = edgeInput(vUv + p * vec2( 1.0, 1.0));
  vec4 d = edgeInput(vUv + p * vec2(-1.0, 0.0));
  vec4 f = edgeInput(vUv + p * vec2( 1.0, 0.0));
  vec4 g = edgeInput(vUv + p * vec2(-1.0,-1.0));
  vec4 h = edgeInput(vUv + p * vec2( 0.0,-1.0));
  vec4 i = edgeInput(vUv + p * vec2( 1.0,-1.0));
  vec4 gx = -a - 2.0*d - g + c + 2.0*f + i;
  vec4 gy = a + 2.0*b + c - g - 2.0*h - i;
  float edge = clamp(sqrt(dot(gx,gx) + dot(gy,gy)) * 0.25, 0.0, 1.0);
  gl_FragColor = vec4(vec3(edge), 1.0);
}
