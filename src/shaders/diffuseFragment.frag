uniform vec3 uLightPosition;
uniform float uAmbientStrength;
uniform float uDiffuseStrength;
uniform vec3 uBaseColor;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightPosition - vViewPosition);

  float ambient = uAmbientStrength;
  float diff = max(dot(normal, lightDir), 0.0);
  float diffuse = uDiffuseStrength * diff;

  float result = ambient + diffuse;
  result = 1.0 - result;
  gl_FragColor = vec4(uBaseColor * result, result);
}
