uniform vec3 uDiffuseColor;

void main() {
  gl_FragColor = vec4(uDiffuseColor, 1.0);
}
