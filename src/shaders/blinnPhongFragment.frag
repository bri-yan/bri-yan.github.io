uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
uniform float uShininess;
uniform float uAmbientStrength;
uniform float uDiffuseStrength;
uniform float uSpecularStrength;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  // Normalize interpolated normal
  vec3 normal = normalize(vNormal);

  // Light direction
  vec3 lightDir = normalize(uLightPosition - vViewPosition);

  // View direction (already pointing from surface to camera)
  vec3 viewDir = normalize(vViewPosition);

  // Halfway vector for Blinn-Phong
  vec3 halfwayDir = normalize(lightDir + viewDir);

  // Ambient component
  vec3 ambient = uAmbientStrength * uAmbientColor;

  // Diffuse component (Lambertian)
  float diff = max(dot(normal, lightDir), 0.0);
  vec3 diffuse = uDiffuseStrength * diff * uLightColor * uDiffuseColor;

  // Specular component (Blinn-Phong)
  float spec = pow(max(dot(normal, halfwayDir), 0.0), uShininess);
  vec3 specular = uSpecularStrength * spec * uLightColor * uSpecularColor;

  // Combine all components
  vec3 result = ambient + diffuse + specular;

  gl_FragColor = vec4(result, 1.0);
}
