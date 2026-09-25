import { useEffect, useMemo, useRef } from 'react';
import { PIPELINE_STAGES } from '../config';
import './PipelineDiagram.css';

const NODE_WIDTH = 72;
const NODE_HEIGHT = 24;
const COLUMN_GAP = 32;
const ROW_GAP = 18;
const PADDING = 12;

function layoutStages(stages) {
  const byKey = new Map(stages.map((stage) => [stage.key, stage]));
  const depths = new Map();

  const getDepth = (stage) => {
    if (depths.has(stage.key)) return depths.get(stage.key);
    const depth = stage.inputs.length
      ? 1 + Math.max(...stage.inputs.map((key) => getDepth(byKey.get(key))))
      : 0;
    depths.set(stage.key, depth);
    return depth;
  };

  stages.forEach(getDepth);
  const columns = new Map();
  stages.forEach((stage) => {
    const depth = depths.get(stage.key);
    columns.set(depth, [...(columns.get(depth) ?? []), stage]);
  });

  const maxRows = Math.max(...[...columns.values()].map((column) => column.length));
  const contentHeight = maxRows * NODE_HEIGHT + (maxRows - 1) * ROW_GAP;
  const nodes = new Map();

  columns.forEach((column, depth) => {
    const columnHeight = column.length * NODE_HEIGHT + (column.length - 1) * ROW_GAP;
    column.forEach((stage, row) => {
      nodes.set(stage.key, {
        ...stage,
        x: PADDING + depth * (NODE_WIDTH + COLUMN_GAP),
        y: PADDING + (contentHeight - columnHeight) / 2 + row * (NODE_HEIGHT + ROW_GAP),
      });
    });
  });

  const maxDepth = Math.max(...depths.values());
  return {
    nodes,
    width: PADDING * 2 + (maxDepth + 1) * NODE_WIDTH + maxDepth * COLUMN_GAP,
    height: PADDING * 2 + contentHeight,
  };
}

/** Interactive graph generated from the same stage definition as Debug.view. */
export function PipelineDiagram({ activeView = 'output', onSelectView }) {
  const rootRef = useRef(null);
  const probing = activeView !== 'output';
  const layout = useMemo(() => layoutStages(PIPELINE_STAGES), []);
  const edges = PIPELINE_STAGES.flatMap((stage) =>
    stage.inputs.map((input) => ({ from: layout.nodes.get(input), to: layout.nodes.get(stage.key) }))
  );

  const select = (stage) => {
    if (!stage.debugView) return;
    onSelectView?.(stage.debugView === activeView ? 'output' : stage.debugView);
  };

  useEffect(() => {
    if (!probing) return undefined;
    const down = { x: 0, y: 0 };
    const onPointerDown = (event) => {
      down.x = event.clientX;
      down.y = event.clientY;
    };
    const onClick = (event) => {
      if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) return;
      if (rootRef.current?.contains(event.target)) return;
      if (event.target.closest?.('[class*="leva"]')) return;
      onSelectView?.('output');
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onSelectView?.('output');
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

      <svg
        className="pd-svg"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width={layout.width}
        height={layout.height}
      >
        <defs>
          <marker
            id="pd-arrow"
            viewBox="0 0 6 6"
            refX="5"
            refY="3"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 6 3 L 0 6 z" className="pd-arrowhead" />
          </marker>
        </defs>

        {edges.map(({ from, to }) => (
          <path
            key={`${from.key}-${to.key}`}
            d={`M ${from.x + NODE_WIDTH} ${from.y + NODE_HEIGHT / 2} H ${(from.x + NODE_WIDTH + to.x - 4) / 2} V ${to.y + NODE_HEIGHT / 2} H ${to.x - 4}`}
            className="pd-edge"
            markerEnd="url(#pd-arrow)"
          />
        ))}

        {[...layout.nodes.values()].map((stage) => {
          const clickable = Boolean(stage.debugView);
          const active = probing ? stage.debugView === activeView : stage.debugView === 'output';
          const classes = [
            'pd-node',
            active && 'pd-node--active',
            !clickable && 'pd-node--source',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <g
              key={stage.key}
              className={classes}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-pressed={clickable ? active : undefined}
              onClick={clickable ? () => select(stage) : undefined}
              onKeyDown={
                clickable
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        select(stage);
                      }
                    }
                  : undefined
              }
            >
              <title>{stage.hint}</title>
              <rect
                x={stage.x}
                y={stage.y}
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx="5"
              />
              <text x={stage.x + NODE_WIDTH / 2} y={stage.y + NODE_HEIGHT / 2 + 3.5}>
                {stage.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="pd-footer">click a pass to probe it · esc or click out to exit</div>
    </div>
  );
}
