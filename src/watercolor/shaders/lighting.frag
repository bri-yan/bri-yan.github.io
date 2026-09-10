uniform vec3 uLightPosition;
uniform float uAmbientStrength;
uniform float uDiffuseStrength;
uniform float uSpecularStrength;
uniform float uShininess;
uniform float uSpecularThreshold;
uniform float uSpecularSoftness;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  // All three vectors are in view space. vViewPosition is NOT negated.
  vec3 toLight = uLightPosition - vViewPosition;
  vec3 light = toLight / max(length(toLight), 0.00001);
  vec3 view = normalize(-vViewPosition);
  float facing = max(dot(normal, light), 0.0);
  float lit = clamp(uAmbientStrength + uDiffuseStrength * facing, 0.0, 1.0);
  vec3 halfway = light + view;
  halfway /= max(length(halfway), 0.00001);
  float specular = uSpecularStrength * pow(max(dot(normal, halfway), 0.0), uShininess);
  // Only the light-facing surface reflects. Strength zero must stay off even
  // at threshold zero. Softness zero retains an antialiased stencil boundary.
  float transition = max(uSpecularSoftness, max(fwidth(specular), 0.00001));
  float mask = smoothstep(uSpecularThreshold, uSpecularThreshold + transition, specular);
  mask *= step(0.00001, facing);
  // These are lighting signals, not pigment or paint transparency.
  gl_FragColor = vec4(1.0 - lit, mask, lit, 1.0);
}
