uniform vec3 uLightPosition;
uniform float uShininess;
uniform float uSpecularStrength;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightPosition - vViewPosition);
  vec3 viewDir = normalize(vViewPosition);
  vec3 halfwayDir = normalize(lightDir + viewDir);

  float spec = pow(max(dot(normal, halfwayDir), 0.0), uShininess);
  float specular = uSpecularStrength * spec;

  gl_FragColor = vec4(specular);
}
