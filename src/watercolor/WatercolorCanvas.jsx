import { useEffect, useRef } from 'react'
import { createRenderer } from './createRenderer'

export function WatercolorCanvas({ settings, onError }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const settingsRef = useRef(settings)
  const onErrorRef = useRef(onError)

  settingsRef.current = settings
  onErrorRef.current = onError

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let engine
    let observer

    try {
      engine = createRenderer(canvas, settingsRef.current, (error) => {
        onErrorRef.current?.(error)
      })
      engineRef.current = engine

      const resize = () => {
        const bounds = canvas.getBoundingClientRect()
        engine.resize(bounds.width, bounds.height, window.devicePixelRatio || 1)
      }

      observer = new ResizeObserver(resize)
      observer.observe(canvas)
      resize()
    } catch (error) {
      onErrorRef.current?.(error)
    }

    return () => {
      observer?.disconnect()
      engine?.dispose()
      if (engineRef.current === engine) engineRef.current = null
    }
  }, [])

  useEffect(() => {
    try {
      engineRef.current?.update(settings)
    } catch (error) {
      onErrorRef.current?.(error)
    }
  }, [settings])

  return (
    <div
      aria-label="Interactive watercolor rendering preview"
      role="img"
      style={{ width: '100%', height: '100%', minHeight: 0 }}
    >
      <canvas
        aria-hidden="true"
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  )
}

export default WatercolorCanvas
