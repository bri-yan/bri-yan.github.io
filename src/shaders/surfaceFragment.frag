// Everything the painting reads from the geometry, in one scene render (MRT):
//   gPaint   = the watercolor layer, premultiplied: (pigment · density, density)
//   gSurface = R diffuse, G specular mask, B subject depth, A coverage
// The layer is the base pigment mapped by the light (color override), thinned
// where lit (dilution), then mottled by pigment turbulence (Montesdeoca
// §5.1.1, Eq. 5.1). Subject depth is normalized per subject, 0 at its nearest
// bound and 1 at its farthest, and −1 on any mesh that isn't a subject.
// concentratePigment (chunks/oklab.glsl) and turbulence
// (chunks/turbulence.glsl) are prepended by SurfacePass.

layout(location = 0) out vec4 gPaint;
layout(location = 1) out vec4 gSurface;

uniform vec3 uLightPositionView;
uniform float uDiffuseAmount; // 0 flat … 1 Lambert
uniform vec3 uBaseColor;
uniform vec3 uShadowColor;
uniform bool uColorOverrideEnabled;
uniform float uDilution;
uniform float uTurbulenceIntensity;
uniform float uTurbulenceScale; // noise cycles per object unit
uniform int uTurbulenceOctaves;
uniform float uTurbulenceWarp;
uniform float uSpecularShininess;
uniform float uSpecularStrength;
uniform float uSpecularThreshold;
uniform bool uSubject;
uniform vec2 uObjectDepthRange; // view depth of the subject's nearest and farthest bound

varying vec3 vViewNormal;
varying vec3 vViewPosition;
varying vec3 vLocalPosition;

void main() {
  vec3 normal = normalize(vViewNormal);
  vec3 lightDirection = normalize(uLightPositionView - vViewPosition);
  float diffuse = mix(1.0, max(dot(normal, lightDirection), 0.0), uDiffuseAmount);

  // Color override maps the light from shadow to base pigment; off, the base
  // pigment sits under the Lambert response. Dilution thins the lit wash.
  vec3 pigment = uColorOverrideEnabled ? mix(uShadowColor, uBaseColor, diffuse) : diffuse * uBaseColor;
  float density = 1.0 - uDilution * diffuse;

  // Turbulence: + concentrates the pigment and thickens density, − thins the
  // wash toward the paper.
  float df = clamp(
    uTurbulenceIntensity * turbulence(vLocalPosition * uTurbulenceScale, uTurbulenceOctaves, uTurbulenceWarp),
    -1.0,
    1.0
  );
  if (df > 0.0) {
    pigment = concentratePigment(pigment, df);
    density = 1.0 - pow(1.0 - density, 1.0 + df);
  } else {
    density *= 1.0 + df;
  }

  // Thresholded Blinn–Phong: the highlights output leaves unpainted.
  vec3 halfway = normalize(lightDirection + normalize(-vViewPosition));
  float highlight = uSpecularStrength * pow(max(dot(normal, halfway), 0.0), uSpecularShininess);
  float specular = highlight > uSpecularThreshold ? 1.0 : 0.0;

  float depth = uSubject
    ? clamp(
        (-vViewPosition.z - uObjectDepthRange.x) / max(uObjectDepthRange.y - uObjectDepthRange.x, 0.0001),
        0.0,
        1.0
      )
    : -1.0;

  gPaint = vec4(pigment * density, density);
  gSurface = vec4(diffuse, specular, depth, 1.0);
}
