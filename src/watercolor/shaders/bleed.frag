uniform sampler2D tInput;
uniform sampler2D tGeometry;
uniform sampler2D tWash;
uniform sampler2D tControl;
uniform int uFirstPass;
uniform vec2 uResolution;
uniform vec2 uDirection;
uniform float uPixelRatio;
uniform float uFar;
uniform float uBleedRadius;
uniform float uBleedStrength;
uniform float uDepthThreshold;
varying vec2 vUv;
void main() {
  vec4 center = texture2D(tInput,vUv);
  if (uBleedRadius<=0.0 || uBleedStrength<=0.0) { gl_FragColor=center; return; }
  vec4 meta = texture2D(tGeometry,vUv);
  float wet = uFirstPass==1 ? texture2D(tControl,vUv).b * texture2D(tWash,vUv).a : texture2D(tControl,vUv).r;
  vec2 stepUv = uDirection * uBleedRadius*uPixelRatio / (5.0*uResolution);
  vec4 sum=vec4(0.0);
  float total=0.0;
  for (int i=-10; i<=10; i++) {
    vec2 uv=vUv+stepUv*float(i);
    vec4 other=texture2D(tGeometry,uv);
    float neighborWet=uFirstPass==1 ? texture2D(tControl,uv).b*texture2D(tWash,uv).a : texture2D(tControl,uv).r;
    bool behind=(meta.a-other.a)*uFar>uDepthThreshold;
    bool allow=(neighborWet>0.001 && behind) || (wet>0.001 && !behind);
    float weight=exp(-0.5*pow(float(i)/5.0,2.0));
    sum+=(allow ? texture2D(tInput,uv) : center)*weight;
    total+=weight;
  }
  // Premultiplied filtering spreads pigment and coverage together, so the
  // empty target cannot introduce a black fringe.
  gl_FragColor=sum/total;
}
