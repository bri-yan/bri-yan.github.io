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
uniform float uTransition; // 0 painted … 1 bare paper (a view transition)
uniform float uDryBrushAmount;
uniform float uDryBrushSoftness;
uniform float uDryBrushLightThreshold; // diffuse level where the dry brush starts
uniform float uDryBrushLightSoftness; // width of the fade around that level
uniform float uDryBrushFleck; // device-pixel radius of the ring of paper each point is compared with; 0 = the paper's own height
uniform float uDryBrushPeakGain; // scales how far a point rises above that ring back to the height's spread
uniform float uDryBrushPeakBlend; // 0 = the paper's own height, 1 = only how far it rises above the ring
uniform bool uLightingEnabled;
uniform vec3 uLightDirection; // normalized, y screen-down, z toward viewer
uniform float uLightStrength; // ds
uniform float uRoughness; // r

varying vec2 vUv;

// > 1 concentrates the grain in the shadows rather than fading in linearly.
const float GRANULATION_DARK_BIAS = 1.5;
const float TRANSITION_SOFTNESS = 0.06; // how gradually a patch of paper goes bare
const float TRANSITION_FADE_START = 0.5; // the transition progress where what is left starts to fade

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
  //
  // With density, a point counts as a peak by how far it rises above the
  // average of a ring of paper around it, not by its height alone. The paper's
  // broad hills then no longer decide where the bare flecks gather, so they are
  // small and evenly spread, and a larger amount adds flecks instead of
  // merging them into patches.
  float dryHeight = height;
  if (uDryBrushFleck > 0.0 && uDryBrushAmount > 0.0) {
    float reach = uDryBrushFleck;
    float diagonal = reach * 0.70710678;
    float ring =
      heightAt(vUv, vec2(reach, 0.0)) + heightAt(vUv, vec2(-reach, 0.0)) +
      heightAt(vUv, vec2(0.0, reach)) + heightAt(vUv, vec2(0.0, -reach)) +
      heightAt(vUv, vec2(diagonal, diagonal)) + heightAt(vUv, vec2(-diagonal, diagonal)) +
      heightAt(vUv, vec2(diagonal, -diagonal)) + heightAt(vUv, vec2(-diagonal, -diagonal));
    float peaks = clamp(0.5 + uDryBrushPeakGain * (height - 0.125 * ring), 0.0, 1.0);
    dryHeight = mix(height, peaks, uDryBrushPeakBlend);
  }
  float lit = smoothstep(
    uDryBrushLightThreshold - uDryBrushLightSoftness,
    uDryBrushLightThreshold + uDryBrushLightSoftness,
    surface.r
  );
  float threshold = mix(1.0 + uDryBrushSoftness, -uDryBrushSoftness, uDryBrushAmount * lit);
  float dryness = smoothstep(threshold - uDryBrushSoftness, threshold + uDryBrushSoftness, dryHeight) * surface.a;

  // View transition: the same bare peaks, swept over the whole painting. The
  // peaks go bare first, then the valleys, until only paper is left; painting
  // in runs it backwards. `rank` evens out the paper height (mostly within
  // 0.25–0.75), so the bare area grows steadily with the transition.
  float rank = smoothstep(0.25, 0.75, height);
  float sweepThreshold = mix(1.0 + TRANSITION_SOFTNESS, -TRANSITION_SOFTNESS, uTransition);
  float sweep = smoothstep(sweepThreshold - TRANSITION_SOFTNESS, sweepThreshold + TRANSITION_SOFTNESS, rank);
  dryness = max(dryness, sweep * surface.a);
  paint.a *= 1.0 - dryness;
  // Whatever pigment is left (the thin, dark rims last of all) fades out on the
  // way to bare paper, and fades back in at the end of painting in.
  paint.a *= 1.0 - smoothstep(TRANSITION_FADE_START, 1.0, uTransition);

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
