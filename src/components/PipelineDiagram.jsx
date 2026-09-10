import { PASSES } from '../watercolor/settings'

export function PipelineDiagram({ selected, onSelect }) {
  const pass = (key) => PASSES.find((item) => item.key === key)
  const button = (key) => {
    const item = pass(key)
    const index = PASSES.indexOf(item)
    return <button className="pipeline-step" type="button" key={key} aria-label={`Inspect view ${index + 1}: ${item.label}`} aria-pressed={selected === key} onClick={() => onSelect(key)}><span className="step-dot" aria-hidden="true"/><span className="step-label">{item.label}</span></button>
  }
  return (
    <div className="pipeline" aria-label="Watercolor render stages">
      <div className="graph-group source-group"><span className="graph-label">LIGHTING → SCENE WASH</span>{['diffuse', 'specular', 'wash', 'depth', 'controls'].map(button)}</div>
      <div className="graph-group edge-group"><span className="graph-label">EDGE ANALYSIS</span>{['edges', 'edgeSpread'].map(button)}</div>
      <div className="graph-group paper-group"><span className="graph-label">PAPER FIELD</span>{button('paper')}</div>
      <div className="graph-group compose-group"><span className="graph-label">COMPOSITE</span>{['pigment', 'bleeding', 'surface', 'final'].map(button)}</div>
    </div>
  )
}
