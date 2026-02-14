/**
 * GLSL shaders for separable 9-tap Gaussian blur.
 * Used in two passes: horizontal then vertical.
 */

export const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** 9-tap Gaussian blur, horizontal pass (sigma ≈ 3.0) */
export const horizontalBlurShader = `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  varying vec2 vUv;

  const float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

  void main() {
    vec2 texelSize = 1.0 / uResolution;
    vec3 result = texture2D(tDiffuse, vUv).rgb * weights[0];

    for (int i = 1; i < 5; i++) {
      float offset = float(i);
      result += texture2D(tDiffuse, vUv + vec2(texelSize.x * offset, 0.0)).rgb * weights[i];
      result += texture2D(tDiffuse, vUv - vec2(texelSize.x * offset, 0.0)).rgb * weights[i];
    }

    gl_FragColor = vec4(result, 1.0);
  }
`;

/** 9-tap Gaussian blur, vertical pass (sigma ≈ 3.0) */
export const verticalBlurShader = `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  varying vec2 vUv;

  const float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

  void main() {
    vec2 texelSize = 1.0 / uResolution;
    vec3 result = texture2D(tDiffuse, vUv).rgb * weights[0];

    for (int i = 1; i < 5; i++) {
      float offset = float(i);
      result += texture2D(tDiffuse, vUv + vec2(0.0, texelSize.y * offset)).rgb * weights[i];
      result += texture2D(tDiffuse, vUv - vec2(0.0, texelSize.y * offset)).rgb * weights[i];
    }

    gl_FragColor = vec4(result, 1.0);
  }
`;
