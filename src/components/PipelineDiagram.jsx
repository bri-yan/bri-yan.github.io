import { useEffect, useRef } from 'react';
import { DEBUG_VIEWS } from '../config';
import './PipelineDiagram.css';

/**
 * Interactive schematic of the render pipeline. Nodes are the passes (keys
 * match DEBUG_VIEWS); clicking one "probes" it — the screen switches to that
 * pass's raw FBO via the debug view. Click again / click out / press Escape /
 * click `final` to return to the composite. Wires into the compositor carry
 * live weight badges; a zero weight renders its wire dashed and dimmed.
 */

const NODES = {
  scene: { x: 8, y: 81, w: 48, h: 22, hint: 'the 3D content' },
  paper: { x: 8, y: 160, w: 48, h: 22, hint: 'paper grain — color in rgb, height in alpha' },
  intensity: { x: 88, y: 25, w: 74, h: 22, hint: 'solid-white silhouette mask' },
  diffuse: { x: 88, y: 81, w: 74, h: 22, hint: 'inverse Lambert — alpha high in shadow' },
  specular: { x: 88, y: 123, w: 74, h: 22, hint: 'hard Blinn-Phong highlight stencil' },
  blur: { x: 192, y: 25, w: 64, h: 22, hint: 'silhouette → soft gradient ramp' },
  diffuseBlur: { x: 192, y: 81, w: 84, h: 22, hint: 'shading softened into a wash' },
  body: { x: 306, y: 25, w: 56, h: 22, hint: 'clean interior wash (+ optional paper grain)' },
  edge: { x: 306, y: 57, w: 56, h: 22, hint: 'wet-front rim, dried into the paper relief' },
  final: { x: 462, y: 60, w: 46, h: 44, hint: 'compositor → screen' },
};

// Orthogonal wires; `weight` names a key in the weights prop, shown as a
// badge at `badge` [x, y] and dashing the wire when the weight is 0.
const EDGES = [
  { d: 'M 56 92 H 72 V 36 H 84' }, // scene → intensity
  { d: 'M 56 92 H 84' }, // scene → diffuse
  { d: 'M 56 92 H 72 V 134 H 84' }, // scene → specular
  { d: 'M 162 36 H 188' }, // intensity → blur
  { d: 'M 256 36 H 302' }, // blur → body
  { d: 'M 256 36 H 280 V 68 H 302' }, // blur → edge
  { d: 'M 56 171 H 334 V 83', weight: 'paper', badge: [180, 171] }, // paper → edge
  { d: 'M 362 36 H 485 V 56', weight: 'body', badge: [410, 36] }, // body → final
  { d: 'M 362 68 H 458', weight: 'edge', badge: [410, 68] }, // edge → final
  { d: 'M 276 92 H 458', weight: 'diffuse', badge: [375, 92] }, // diffuseBlur → final
  { d: 'M 162 134 H 485 V 108', weight: 'specular', badge: [375, 134] }, // specular → final
  { d: 'M 224 47 V 52 H 470 V 56', weight: 'blur', badge: [330, 52] }, // blur → final (standalone)
];

const fmtWeight = (w) => `×${Math.round(w * 100) / 100}`;

export function PipelineDiagram({ activeView = 'final', weights = {}, onSelectView }) {
  const rootRef = useRef(null);
  const probing = activeView !== 'final';

  const select = (key) => onSelectView?.(key === activeView ? 'final' : key);

  // While probing: Escape or a plain click outside the diagram (and outside
  // the leva panel) returns to the final view. Orbit drags don't count as
  // clicks — pointer travel beyond a few px is ignored.
  useEffect(() => {
    if (!probing) return undefined;
    const down = { x: 0, y: 0 };
    const onPointerDown = (e) => {
      down.x = e.clientX;
      down.y = e.clientY;
    };
    const onClick = (e) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      if (rootRef.current?.contains(e.target)) return;
      if (e.target.closest?.('[class*="leva"]')) return;
      onSelectView?.('final');
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onSelectView?.('final');
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [probing, onSelectView]);

  return (
    <div className="pipeline-diagram" ref={rootRef} aria-label="Render pipeline diagram">
      <div className="pd-header">
        <span className="pd-header__title">Watercolor Pipeline</span>
        <span className={`pd-header__probe${probing ? ' pd-header__probe--on' : ''}`}>
          ▸ {activeView}
        </span>
      </div>

      <svg className="pd-svg" viewBox="0 0 520 192" width="520" height="192">
        <defs>
          <marker
            id="pd-arrow"
            viewBox="0 0 6 6"
            refX="5"
            refY="3"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 6 3 L 0 6 z" className="pd-arrowhead" />
          </marker>
        </defs>

        {EDGES.map((edge) => {
          const off = edge.weight != null && (weights[edge.weight] ?? 0) === 0;
          return (
            <path
              key={edge.d}
              d={edge.d}
              className={`pd-edge${off ? ' pd-edge--off' : ''}`}
              markerEnd="url(#pd-arrow)"
            />
          );
        })}

        {EDGES.filter((e) => e.weight != null).map((edge) => {
          const value = weights[edge.weight] ?? 0;
          const [bx, by] = edge.badge;
          return (
            <g
              key={`badge-${edge.weight}`}
              className={`pd-badge${value === 0 ? ' pd-badge--off' : ''}`}
              data-weight={edge.weight}
            >
              <rect x={bx - 17} y={by - 6} width="34" height="12" rx="6" />
              <text x={bx} y={by + 2.5}>
                {fmtWeight(value)}
              </text>
            </g>
          );
        })}

        {Object.entries(NODES).map(([key, n]) => {
          const clickable = key === 'final' || DEBUG_VIEWS.includes(key);
          const active = probing ? activeView === key : key === 'final';
          const classes = [
            'pd-node',
            active && 'pd-node--active',
            !clickable && 'pd-node--source',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <g
              key={key}
              className={classes}
              data-view={clickable ? key : undefined}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-pressed={clickable ? active : undefined}
              onClick={clickable ? () => select(key) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        select(key);
                      }
                    }
                  : undefined
              }
            >
              <title>{n.hint}</title>
              <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="5" />
              <text x={n.x + n.w / 2} y={n.y + (key === 'final' ? 15 : n.h / 2 + 3.5)}>
                {key}
              </text>
              {key === 'final' && (
                <text className="pd-node__sub" x={n.x + n.w / 2} y={n.y + 31}>
                  {`gain ${fmtWeight(weights.diffuseGain ?? 0)}`}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="pd-footer">click a pass to probe it · esc or click out to exit</div>
    </div>
  );
}
