varying float vViewDepth;

void main() {
  gl_FragColor = vec4(vViewDepth, vViewDepth, 0.0, 1.0);
}
