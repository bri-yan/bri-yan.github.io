uniform sampler2D tControl;
uniform sampler2D tGeometry;
uniform sampler2D tWash;
uniform int uFirstPass;
uniform vec2 uResolution;
uniform vec2 uDirection;
uniform float uPixelRatio;
uniform float uFar;
uniform float uBleedRadius;
uniform float uDepthThreshold;
varying vec2 vUv;
float wetAt(vec2 uv) {
  return uFirstPass==1 ? texture2D(tControl,uv).b*texture2D(tWash,uv).a : texture2D(tControl,uv).r;
}
void main() {
  float depth=texture2D(tGeometry,vUv).a*uFar;
  float wet=wetAt(vUv);
  float expanded=wet;
  vec2 stepUv=uDirection*uBleedRadius*uPixelRatio/(5.0*uResolution);
  for (int i=-10;i<=10;i++) {
    vec2 uv=vUv+float(i)*stepUv;
    float neighbor=wetAt(uv);
    bool behind=depth-uDepthThreshold>texture2D(tGeometry,uv).a*uFar;
    if ((neighbor>0.001 && behind) || (wet>0.001 && !behind)) expanded=max(expanded,neighbor);
  }
  gl_FragColor=vec4(vec3(expanded),1.0);
}
