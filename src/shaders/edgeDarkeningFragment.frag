// Edge darkening (Montesdeoca §5.2.1): pigment gathers toward the rim of a
// wash. Blurred edges give the gradual band, Ed = k·Eb. The rim is concentrated
// with concentratePigment (chunks/oklab.glsl, prepended by the pass), eased by
// 1 − e^(−Ed) so it never reaches black. (A per-channel C^(1+Ed) can't darken
// channels at 1.0 and drifts every rim toward the strongest channel.) Density
// concentrates by the thesis power.

uniform sampler2D tPaint; // straight RGB pigment (display-encoded), A = density
uniform sampler2D tEdges; // blurred sobel, un-premultiplied edge in R
uniform float uStrength; // global edge darkening k

varying vec2 vUv;

void main() {
  vec4 paint = texture2D(tPaint, vUv);
  float concentration = uStrength * texture2D(tEdges, vUv).r; // Ed

  vec3 pigment = concentratePigment(paint.rgb, 1.0 - exp(-concentration));
  float density = 1.0 - pow(1.0 - paint.a, 1.0 + concentration);
  gl_FragColor = vec4(pigment, density);
}
