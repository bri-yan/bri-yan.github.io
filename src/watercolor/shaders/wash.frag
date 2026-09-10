uniform vec3 uPigment;
uniform sampler2D tLighting;
uniform vec2 uResolution;
uniform float uShade;
uniform float uHighlight;
uniform float uVariation;
varying vec3 vPosition;
// Mesh-local variation follows the object instead of swimming with the camera.
void main() {
  vec2 lighting = texture2D(tLighting, gl_FragCoord.xy / uResolution).rg;
  vec3 color = uPigment;
  float mottling = sin(vPosition.x * 3.4 + sin(vPosition.z * 4.1))
                 * sin(vPosition.y * 4.7 + vPosition.z * 1.8);
  color = pow(max(color, vec3(0.0001)), vec3(1.0 + mottling * uVariation));
  // test's inverse Lambert signal becomes pigment dilution, rather than an
  // opacity multiplier. Blinn-Phong highlights dilute toward the same paper.
  color = mix(color, vec3(1.0), uShade * (1.0 - lighting.r));
  color = mix(color, vec3(1.0), uHighlight * lighting.g);
  gl_FragColor = vec4(color, 1.0);
}
