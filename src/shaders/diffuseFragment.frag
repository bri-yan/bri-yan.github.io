// Inverse Lambert shading: ambient + diffuse, then INVERTED — alpha is low
// where the surface faces the light and high in shadow. The compositor uses
// this alpha as a stylized shading wash on the paint.

uniform vec3 uLightPosition;
uniform float uAmbientStrength;
uniform float uDiffuseStrength;
uniform vec3 uBaseColor;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightPosition - vViewPosition);

  float lit = uAmbientStrength + uDiffuseStrength * max(dot(normal, lightDir), 0.0);
  float shade = 1.0 - lit; // inverted: shadow carries the signal

  gl_FragColor = vec4(uBaseColor * shade, shade);
}
