uniform vec3 uLightPositionView;
uniform float uShininess;
uniform float uStrength;
uniform float uThreshold;

varying vec3 vViewNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vViewNormal);
  vec3 lightDirection = normalize(uLightPositionView - vViewPosition);
  vec3 viewDirection = normalize(-vViewPosition);
  vec3 halfwayDirection = normalize(lightDirection + viewDirection);
  float highlight = uStrength * pow(max(dot(normal, halfwayDirection), 0.0), uShininess);
  float mask = highlight > uThreshold ? 1.0 : 0.0;
  gl_FragColor = vec4(mask);
}
