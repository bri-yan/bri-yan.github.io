// Joins color-override pigment (RGB) with dilution density (A), then applies
// pigment turbulence (Montesdeoca §5.1.1, Eq. 5.1): positive df concentrates
// the pigment (concentratePigment, chunks/oklab.glsl, prepended by the pass)
// and thickens density; negative df thins the wash toward the paper.

uniform sampler2D tColorOverride;
uniform sampler2D tDilution;
uniform sampler2D tTurbulence; // R = signed density offset, A = coverage
uniform float uIntensity;

varying vec2 vUv;

void main() {
  vec3 pigment = texture2D(tColorOverride, vUv).rgb;
  float density = texture2D(tDilution, vUv).a;
  vec4 turbulence = texture2D(tTurbulence, vUv);
  float df = clamp(uIntensity * turbulence.r * turbulence.a, -1.0, 1.0);

  if (df > 0.0) {
    pigment = concentratePigment(pigment, df);
    density = 1.0 - pow(1.0 - density, 1.0 + df);
  } else {
    density *= 1.0 + df;
  }

  gl_FragColor = vec4(pigment, density);
}
