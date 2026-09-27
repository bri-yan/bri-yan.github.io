uniform sampler2D tSource;

varying vec2 vUv;

void main() {
  gl_FragColor = vec4(texture2D(tSource, vUv).rgb, 1.0);
}
