// Paper layer: tiles the paper texture at pipeline resolution and packs its
// brightness (the ridge/valley relief) into alpha. rgb = paper color.

uniform sampler2D tPaper;
uniform vec2 uRepeat;

varying vec2 vUv;

void main() {
  vec3 rgb = texture2D(tPaper, vUv * uRepeat).rgb;
  gl_FragColor = vec4(rgb, rgbIntensity(rgb));
}
