/**
 * GLSL shaders for compositing multiple render passes.
 * Combines Blinn-Phong and Blur outputs.
 */

export const compositorVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const compositorFragmentShader = `
  uniform sampler2D tBlinnPhong;
  uniform sampler2D tBlur;
  uniform float uBlinnPhongWeight;
  uniform float uBlurWeight;
  uniform float uBlendMode; // 0 = additive, 1 = multiply, 2 = screen

  varying vec2 vUv;

  vec3 blendAdditive(vec3 a, vec3 b) {
    return a + b;
  }

  vec3 blendMultiply(vec3 a, vec3 b) {
    return a * b;
  }

  vec3 blendScreen(vec3 a, vec3 b) {
    return 1.0 - (1.0 - a) * (1.0 - b);
  }

  void main() {
    vec3 blinnPhong = texture2D(tBlinnPhong, vUv).rgb;
    vec3 blur = texture2D(tBlur, vUv).rgb;

    // Weight the inputs
    blinnPhong *= uBlinnPhongWeight;
    blur *= uBlurWeight;

    // Blend based on mode
    vec3 result;
    if (uBlendMode < 0.5) {
      // Additive
      result = blendAdditive(blinnPhong, blur);
    } else if (uBlendMode < 1.5) {
      // Multiply
      result = blendMultiply(blinnPhong, blur);
    } else {
      // Screen
      result = blendScreen(blinnPhong, blur);
    }

    gl_FragColor = vec4(result, 1.0);
  }
`;
