uniform sampler2D tInput;
uniform sampler2D tGeometry;
uniform sampler2D tWash;
uniform int uDebugMode;
uniform int uChannel;
uniform float uNear;
uniform float uFar;
varying vec2 vUv;
vec3 linearToDisplay(vec3 color) {
  color=max(color,vec3(0.0));
  return mix(12.92*color,1.055*pow(color,vec3(1.0/2.4))-0.055,step(vec3(0.0031308),color));
}
void main() {
  vec4 value=texture2D(tInput,vUv);
  // Both views share the packed lighting target. Present the chosen signal
  // as grayscale, while alpha still exposes geometry coverage.
  if (uDebugMode==10) value.rgb=vec3(value.r);
  if (uDebugMode==11) value.rgb=vec3(value.g);
  vec3 color=value.rgb;
  if (uDebugMode==2) {
    float occupied=texture2D(tWash,vUv).a;
    float depth=texture2D(tGeometry,vUv).a*uFar;
    color=vec3(occupied*(1.0-clamp((depth-uNear)/12.0,0.0,1.0)));
  } else if (uDebugMode==5) {
    color=vec3(value.r);
  } else if (uDebugMode==0 || uDebugMode==8) {
    color=linearToDisplay(color);
  } else if (uDebugMode==1 || uDebugMode==6 || uDebugMode==7) {
    color=linearToDisplay(color+vec3(1.0-value.a));
  }
  if (uDebugMode!=0 && uChannel==1) color=vec3(value.a);
  if (uDebugMode!=0 && uChannel==2) color=value.rgb*value.a;
  gl_FragColor=vec4(color,1.0);
}
