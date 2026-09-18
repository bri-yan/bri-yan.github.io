uniform sampler2D tDiffuse;
uniform vec3 uBaseColor;
uniform vec3 uShadowColor;
uniform float uEnabled;

varying vec2 vUv;

void main() {
  vec4 diffuse = texture2D(tDiffuse, vUv);
  vec3 overrideColor = mix(uShadowColor, uBaseColor, diffuse.r);
  vec3 color = mix(diffuse.r * uBaseColor, overrideColor, uEnabled);
  gl_FragColor = vec4(color, diffuse.a);
}
