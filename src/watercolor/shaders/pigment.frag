uniform sampler2D tWash;
uniform sampler2D tGeometry;
uniform sampler2D tEdges;
uniform sampler2D tPaper;
uniform float uEdgeStrength;
uniform float uPigmentDensity;
uniform float uGranulation;
uniform float uDryBrush;
uniform float uBleedStrength;
varying vec2 vUv;
void main() {
  vec4 wash = texture2D(tWash,vUv);
  vec3 base = wash.a > 0.00001 ? wash.rgb / wash.a : vec3(1.0);
  vec3 control = texture2D(tGeometry,vUv).rgb;
  float height = texture2D(tPaper,vUv).r;
  float edge = texture2D(tEdges,vUv).r;
  float wetness = clamp(uBleedStrength * control.b, 0.0, 1.0);
  float density = max(0.05, uPigmentDensity * mix(0.75,1.25,control.g));
  density += edge * uEdgeStrength * control.r * (1.0-wetness);
  float luminance = dot(base,vec3(0.2126,0.7152,0.0722));
  density += uGranulation * (1.0-height) * (0.2+3.0*luminance);
  vec3 pigment = pow(clamp(base,0.0001,1.0),vec3(density));
  // Dry paint catches peaks and skips valleys, unlike wet granulation.
  float deposit = smoothstep(uDryBrush*0.65, uDryBrush*0.65+0.12, height);
  float coverage = wash.a * mix(1.0,deposit,clamp(uDryBrush*2.0,0.0,1.0));
  gl_FragColor = vec4(pigment*coverage, coverage);
}
