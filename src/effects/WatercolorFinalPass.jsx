import { forwardRef, useMemo } from 'react'
import { Effect, BlendFunction } from 'postprocessing'

/**
 * Placeholder final pass: receives the blurred intensity image (ρ) from the
 * previous pass and outputs it to screen. Verifies the pipeline chain.
 * Replace with edge darkening, pigment granulation, etc. later.
 */
const fragmentShader = `
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = inputColor;
}
`

class WatercolorFinalPassImpl extends Effect {
  constructor() {
    super('WatercolorFinalPass', fragmentShader, {
      blendFunction: BlendFunction.SRC,
    })
  }
}

export const WatercolorFinalPass = forwardRef(function WatercolorFinalPass(_, ref) {
  const effect = useMemo(() => new WatercolorFinalPassImpl(), [])
  return <primitive ref={ref} object={effect} dispose={null} />
})
