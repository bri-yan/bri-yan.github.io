uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uPaperScale;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float height(vec2 p) {
  return 0.57*noise(p) + 0.28*noise(p*2.03+7.2) + 0.15*noise(p*4.09+23.1);
}
void main() {
  // CSS-pixel coordinates keep the paper fixed while the camera moves.
  vec2 p = vUv * uResolution / (uPixelRatio * max(uPaperScale, 0.5));
  float h = height(p);
  vec2 slope = vec2(height(p+vec2(0.25,0))-height(p-vec2(0.25,0)),
                    height(p+vec2(0,0.25))-height(p-vec2(0,0.25)));
  gl_FragColor = vec4(h, slope*0.5+0.5, 1.0);
}
