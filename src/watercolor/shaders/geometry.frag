uniform float uFar;
uniform float uControlVariation;
varying vec3 vPosition;
varying vec3 vViewPosition;
void main() {
  vec3 wave = sin(vPosition.xyz * 2.3 + sin(vPosition.zxy * 3.1));
  // Three independent effect fields, rasterized from object coordinates.
  vec3 controls = mix(vec3(1.0), 0.5 + 0.5 * wave, uControlVariation);
  // At full variation there are genuinely dry regions, not just slightly
  // less wet ones. Algorithm 2 treats zero as a barrier to incoming bleed.
  controls.b = mix(1.0, smoothstep(0.35, 0.65, 0.5+0.5*wave.b), uControlVariation);
  gl_FragColor = vec4(controls, clamp(-vViewPosition.z / uFar, 0.0, 1.0));
}
