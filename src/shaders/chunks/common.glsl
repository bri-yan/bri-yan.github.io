// Shared helpers, prepended to shaders via string concat (see the pass files).

// Normalized brightness of an rgb sample: 0 = black, 1 = white.
float rgbIntensity(vec3 rgb) {
  return length(rgb) / sqrt(3.0);
}
