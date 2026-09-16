varying float vViewDepth;

void main() {
  // R is unnormalized view-space distance; A is explicit scene coverage.
  gl_FragColor = vec4(vViewDepth, 0.0, 0.0, 1.0);
}
