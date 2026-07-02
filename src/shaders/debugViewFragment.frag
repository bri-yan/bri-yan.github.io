uniform sampler2D tInput;
uniform int uChannel; // 0 = rgb, 1 = alpha as grayscale, 2 = rgb × alpha

varying vec2 vUv;

void main() {
  vec4 t = texture2D(tInput, vUv);
  vec3 c = uChannel == 1 ? vec3(t.a) : uChannel == 2 ? t.rgb * t.a : t.rgb;
  gl_FragColor = vec4(c, 1.0);
}
