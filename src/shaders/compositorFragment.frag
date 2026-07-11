// Final collage — the only pass that draws to the screen. Combines the paint
// layers (edge + body) shaded by the blurred inverse-light wash, punches in
// specular highlights, and composites over the background color.

uniform sampler2D tEdge;      // wet-front rim (premultiplied)
uniform sampler2D tBody;      // interior wash (premultiplied)
uniform sampler2D tDiffuse;   // BLURRED inverse Lambert; the wash lives in alpha
uniform sampler2D tSpecular;  // hard highlight stencil in alpha
uniform sampler2D tBlur;      // blurred silhouette ramp (optional extra term)
uniform float uEdgeWeight;
uniform float uBodyWeight;
uniform float uDiffuseWeight;
uniform float uSpecularWeight;
uniform float uBlurWeight;
uniform float uDiffuseGain;   // rescales diffuse.a (peaks well below 1) toward full brightness
uniform vec3 uBackgroundColor;

varying vec2 vUv;

void main() {
  vec4 edge = texture2D(tEdge, vUv) * uEdgeWeight;
  vec4 body = texture2D(tBody, vUv) * uBodyWeight;
  vec4 diffuse = texture2D(tDiffuse, vUv) * uDiffuseWeight;
  vec4 blur = texture2D(tBlur, vUv) * uBlurWeight;
  float specularMask = texture2D(tSpecular, vUv).a; // sampled unweighted

  // The paint = rim over wash, capped before shading so overlaps don't bloom.
  vec4 paint = clamp(edge+ body, 0.0, 1.0);

  // Shade by the inverse-light wash: dim toward the lit side, bright in shadow.
  vec4 result = paint * diffuse.a * uDiffuseGain;

  // Specular highlights punch straight through the watercolor.
  if (specularMask > 0.5) result = vec4(uSpecularWeight);

  // paint rgb is premultiplied by alpha, so composite over the background
  // with add + inverse-alpha rather than mix.
  result = clamp(result, 0.0, 1.0);
  gl_FragColor = vec4(result.rgb + uBackgroundColor * (1.0 - result.a), 1.0);
  // gl_FragColor = vec4(vec3(result), 1.0);
}
