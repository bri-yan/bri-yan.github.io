uniform sampler2D tInput;
uniform sampler2D tGeometry;
uniform sampler2D tPaper;
uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uFar;
uniform float uDistortion;
uniform float uPaperRelief;
uniform vec3 uPaperColor;
varying vec2 vUv;
void main() {
  vec3 paper=texture2D(tPaper,vUv).rgb;
  vec2 slope=(paper.gb-0.5)*2.0;
  vec2 offset=slope*uDistortion*uPixelRatio/uResolution;
  vec2 displaced=clamp(vUv+offset,vec2(0.0),vec2(1.0));
  float sourceDepth=texture2D(tGeometry,vUv).a*uFar;
  float destinationDepth=texture2D(tGeometry,displaced).a*uFar;
  // Guard foreground surfaces from sampling a distant background layer.
  if (destinationDepth > sourceDepth+0.12) displaced=vUv;
  vec4 paint=texture2D(tInput,displaced);
  vec3 normal=normalize(vec3(-slope*2.0,1.0));
  float relief=dot(normal,normalize(vec3(-0.5,0.7,1.0)))-0.7581;
  vec3 background=uPaperColor*(1.0+relief*uPaperRelief);
  vec3 color=paint.rgb*uPaperColor+background*(1.0-paint.a);
  color*=1.0+relief*uPaperRelief*paint.a;
  gl_FragColor=vec4(max(color,vec3(0.0)),1.0);
}
