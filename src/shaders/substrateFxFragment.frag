// The final painting: substrate effects over the paint layer, in thesis order
// (Montesdeoca §5.3): distortion → highlight lift → paint over paper → lighting.

uniform sampler2D tPaint; // straight RGB pigment, A = density
uniform sampler2D tGradient; // RG = ∇h per paper unit, y screen-down
uniform sampler2D tSpecular; // A = highlight mask
uniform vec2 uCssPixelToUv;
uniform vec3 uPaperColor;
uniform bool uDistortionEnabled;
uniform float uDistortion; // CSS pixels of shift per unit slope
uniform bool uLightingEnabled;
uniform vec3 uLightDirection; // normalized, y screen-down, z toward viewer
uniform float uLightStrength; // ds
uniform float uRoughness; // r

varying vec2 vUv;

void main() {
  vec2 slope = texture2D(tGradient, vUv).rg;

  // Distortion: sample uphill so pigment slides into the paper's valleys.
  vec2 uv = vUv;
  if (uDistortionEnabled) {
    uv += uDistortion * vec2(slope.x, -slope.y) * uCssPixelToUv;
  }
  vec4 paint = texture2D(tPaint, uv);

  // Highlights are left unpainted: lift the pigment so bare paper shows.
  paint.a *= 1.0 - texture2D(tSpecular, uv).a;

  // Paint over the flat paper color (substrate RGB already bakes its own relief).
  vec3 color = mix(uPaperColor, paint.rgb, paint.a);

  // Lighting: normal = up + a lean toward the valley; Id = 1 − ds·(1 − L·N).
  if (uLightingEnabled) {
    vec3 normal = normalize(vec3(-uRoughness * slope, 1.0));
    float diffuse = max(dot(uLightDirection, normal), 0.0);
    color *= 1.0 - uLightStrength * (1.0 - diffuse);
  }

  gl_FragColor = vec4(color, 1.0);
}
