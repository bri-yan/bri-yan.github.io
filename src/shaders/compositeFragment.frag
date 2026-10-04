// The finished painting, without the cursor (OutputPass adds it per frame):
// substrate effects over the edge-darkened paint in thesis order (Montesdeoca
// §5.3): distortion → granulation and dry brush (§5.1.2) → highlight lift →
// paint over paper → lighting.
// concentratePigment (chunks/oklab.glsl) and paperSlope / tSubstrate
// (chunks/paperSlope.glsl) are prepended by CompositePass.

uniform sampler2D tPaint; // straight RGB pigment, A = density
uniform sampler2D tSurface; // R diffuse, G specular mask, A coverage
uniform vec2 uCssPixelToUv;
uniform vec3 uPaperColor;
uniform bool uDistortionEnabled;
uniform float uDistortion; // CSS pixels of shift per unit slope
uniform float uGranulation;
uniform float uDryBrushAmount;
uniform float uDryBrushSoftness;
uniform float uDryBrushLightThreshold; // diffuse level where the dry brush starts
uniform float uDryBrushLightSoftness; // width of the fade around that level
uniform bool uLightingEnabled;
uniform vec3 uLightDirection; // normalized, y screen-down, z toward viewer
uniform float uLightStrength; // ds
uniform float uRoughness; // r

varying vec2 vUv;

// > 1 concentrates the grain in the shadows rather than fading in linearly.
const float GRANULATION_DARK_BIAS = 1.5;

void main() {
  vec2 slope = paperSlope(vUv);

  // Distortion: sample uphill so pigment slides into the paper's valleys.
  vec2 uv = vUv;
  if (uDistortionEnabled) {
    uv += uDistortion * vec2(slope.x, -slope.y) * uCssPixelToUv;
  }
  vec4 paint = texture2D(tPaint, uv);

  // Granulation and dry brush belong to the paper, so they are read at the
  // undistorted pixel: the paint slides, but the grain and the bare peaks stay
  // on the tooth. Both are weighted by the diffuse light and the coverage.
  vec4 surface = texture2D(tSurface, vUv);
  float height = texture2D(tSubstrate, vUv).a; // 0 valley … 1 peak

  // Granulation, strongest in shadow, is an Eq. 5.1 density offset like
  // turbulence: + settles into the valleys, − drains off the peaks.
  float shadow = pow(clamp(1.0 - surface.r, 0.0, 1.0), GRANULATION_DARK_BIAS);
  float settling = uGranulation * shadow * (1.0 - 2.0 * height) * surface.a;
  if (settling > 0.0) {
    paint.rgb = concentratePigment(paint.rgb, settling);
    paint.a = 1.0 - pow(1.0 - paint.a, 1.0 + settling);
  } else {
    paint.a *= 1.0 + settling;
  }

  // Dry brush: wherever the light is above the threshold, a thinly loaded
  // brush skips the peaks and leaves them bare. Reach 0 puts the whole ramp
  // above height 1, so amount 0 skips nothing.
  float lit = smoothstep(
    uDryBrushLightThreshold - uDryBrushLightSoftness,
    uDryBrushLightThreshold + uDryBrushLightSoftness,
    surface.r
  );
  float threshold = mix(1.0 + uDryBrushSoftness, -uDryBrushSoftness, uDryBrushAmount * lit);
  float dryness = smoothstep(threshold - uDryBrushSoftness, threshold + uDryBrushSoftness, height) * surface.a;
  paint.a *= 1.0 - dryness;

  // Highlights are left unpainted: lift the pigment so bare paper shows.
  paint.a *= 1.0 - texture2D(tSurface, uv).g;

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
