uniform sampler2D tColor;
uniform vec3 uBackgroundColor;

varying vec2 vUv;

void main() {
  vec4 color = texture2D(tColor, vUv);
  vec3 composited = color.rgb + uBackgroundColor * (1.0 - color.a);
  gl_FragColor = vec4(composited, 1.0);
}
