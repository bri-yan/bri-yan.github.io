uniform sampler2D tInput;
uniform sampler2D tOriginal;
uniform sampler2D tControl;
uniform float uBleedStrength;
varying vec2 vUv;
void main() {
  float wetness=clamp(texture2D(tControl,vUv).r*uBleedStrength,0.0,1.0);
  gl_FragColor=mix(texture2D(tOriginal,vUv),texture2D(tInput,vUv),wetness);
}
