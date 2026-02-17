import { forwardRef, useMemo } from 'react'
import { Vector2 } from 'three'
import { Effect, BlendFunction, EffectAttribute, Uniform } from 'postprocessing'

/**
 * 1D Gaussian blur fragment shader (separable).
 * Samples inputBuffer along uDirection using built-in texelSize.
 * Kernel: 9 taps for smooth result suitable for later gradient (∇ρ) use.
 */
const fragmentShader = `
uniform vec2 uDirection;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 step = uDirection * texelSize;
  // 9-tap 1D Gaussian kernel (sigma ~2), symmetric weights
  float w0 = 0.05;
  float w1 = 0.09;
  float w2 = 0.12;
  float w3 = 0.16;
  float w4 = 0.18;

  vec4 sum = texture2D(inputBuffer, uv - 4.0 * step) * w0
           + texture2D(inputBuffer, uv - 3.0 * step) * w1
           + texture2D(inputBuffer, uv - 2.0 * step) * w2
           + texture2D(inputBuffer, uv - 1.0 * step) * w3
           + texture2D(inputBuffer, uv) * w4
           + texture2D(inputBuffer, uv + 1.0 * step) * w3
           + texture2D(inputBuffer, uv + 2.0 * step) * w2
           + texture2D(inputBuffer, uv + 3.0 * step) * w1
           + texture2D(inputBuffer, uv + 4.0 * step) * w0;

  outputColor = sum;
}
`

class GaussianBlurHorizontalEffect extends Effect {
  constructor({ radius = 4 } = {}) {
    super('GaussianBlurHorizontal', fragmentShader, {
      blendFunction: BlendFunction.SRC,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([['uDirection', new Uniform(new Vector2(1, 0))]]),
    })
  }
}

class GaussianBlurVerticalEffect extends Effect {
  constructor({ radius = 4 } = {}) {
    super('GaussianBlurVertical', fragmentShader, {
      blendFunction: BlendFunction.SRC,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([['uDirection', new Uniform(new Vector2(0, 1))]]),
    })
  }
}

export const GaussianBlurHorizontal = forwardRef(function GaussianBlurHorizontal(props, ref) {
  const effect = useMemo(() => new GaussianBlurHorizontalEffect(props), [])
  return <primitive ref={ref} object={effect} dispose={null} />
})

export const GaussianBlurVertical = forwardRef(function GaussianBlurVertical(props, ref) {
  const effect = useMemo(() => new GaussianBlurVerticalEffect(props), [])
  return <primitive ref={ref} object={effect} dispose={null} />
})
