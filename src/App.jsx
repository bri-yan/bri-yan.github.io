import { useCallback, useEffect, useState } from 'react'
import { Leva } from 'leva'
import './App.css'
import { PipelineDiagram } from './components/PipelineDiagram'
import { useWatercolorControls } from './dev/useWatercolorControls'
import { WatercolorCanvas } from './watercolor/WatercolorCanvas'
import { PASSES } from './watercolor/settings'

function App() {
  const { settings, setDebugView } = useWatercolorControls()
  const [rendererError, setRendererError] = useState('')

  const selectedPass = settings.debugView
  const selectPass = useCallback((key) => {
    setDebugView(selectedPass === key ? 'final' : key)
  }, [selectedPass, setDebugView])

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') selectPass('final') }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectPass])

  const activePass = PASSES.find(({ key }) => key === selectedPass) ?? PASSES.at(-1)
  return (
    <main className="study-shell">
      <header className="study-header">
        <p className="eyebrow">ASTRA / THESIS EXPERIMENT</p>
        <h1>Watercolor study</h1>
        <p className="intro">Explore how color, depth, and paper turn a simple shape into a watercolor wash.</p>
      </header>
      <section className="workspace" aria-label="Interactive watercolor renderer">
        <div className="canvas-frame">
          <WatercolorCanvas settings={settings} onError={(error) => setRendererError(error?.message || String(error))} />
          <div className="canvas-caption" aria-hidden="true"><span>drag to orbit</span><span>scroll to zoom</span></div>
          {rendererError && <div className="renderer-error" role="alert"><strong>The renderer stopped.</strong><span>{rendererError}</span></div>}
        </div>
        <aside className="pipeline-panel" aria-label="Rendering pipeline">
          <div className="pipeline-heading"><span>RENDER PATH</span><span>{PASSES.length} VIEWS</span></div>
          <PipelineDiagram selected={selectedPass} onSelect={selectPass} />
          <div className="pass-detail" aria-live="polite">
            <span>{String(PASSES.findIndex(({ key }) => key === activePass.key) + 1).padStart(2, '0')}</span>
            <div><strong>{activePass.label}</strong><p>{activePass.description}</p></div>
          </div>
        </aside>
      </section>
      <p className="panel-note">Tune the paint and inspect individual passes in the controls.</p>
      <div className="controls-dock"><Leva fill titleBar={{ title: 'Watercolor controls', drag: false }} collapsed={false} oneLineLabels /></div>
    </main>
  )
}

export default App
