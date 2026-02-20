uniform sampler2D tPaper;
uniform vec2 uRepeat;

varying vec2 vUv;

void main() {
  vec3 rgb = texture2D(tPaper, vUv * uRepeat).rgb;
  float alpha = length(rgb) / sqrt(3.0) ;
  gl_FragColor = vec4(rgb, alpha);
}
