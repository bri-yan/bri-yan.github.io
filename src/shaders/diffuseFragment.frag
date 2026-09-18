uniform vec3 uLightPositionView;
uniform float uDiffuseAmount;

varying vec3 vViewNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vViewNormal);
  vec3 lightDirection = normalize(uLightPositionView - vViewPosition);
  float lambert = max(dot(normal, lightDirection), 0.0);
  float diffuse = mix(1.0, lambert, uDiffuseAmount);
  gl_FragColor = vec4(vec3(diffuse), 1.0);
}
