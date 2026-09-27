import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PIPELINE_STAGES } from '../config';
import './PipelineDiagram.css';

// Each stage is a label centered in its column, which is as wide as its widest
// label; wires run between the measured label ends, so there are no boxes.
const MIN_COLUMN_WIDTH = 36;
const FALLBACK_LABEL_WIDTH = 50; // until webfonts load and labels are measured
const NODE_HEIGHT = 20;
const COLUMN_GAP = 32;
const ROW_GAP = 12;
const PADDING = 8;
const WIRE_GAP = 5; // space between a label and its wire
const JOIN_OFFSET = 10; // wires turn this far before the next column

const ROW_STEP = NODE_HEIGHT + ROW_GAP;
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * Layered left-to-right layout. Columns follow data depth, with each stage
 * as late as its consumers allow, so side inputs like the substrate enter
 * where they are used. Within a column, stages sit at the average row of
 * their inputs, so wires run straight or fan without crossing. A stage fed
 * across skipped columns (scene → specular) takes a free lane below them;
 * sources then center on the stages they feed.
 */
function layoutStages(stages, labelWidths) {
  const byKey = new Map(stages.map((stage) => [stage.key, stage]));
  const children = new Map(stages.map((stage) => [stage.key, []]));
  stages.forEach((stage) => stage.inputs.forEach((input) => children.get(input).push(stage.key)));

  // Earliest column each stage can occupy...
  const depths = new Map();
  const asap = (stage) => {
    if (depths.has(stage.key)) return depths.get(stage.key);
    const depth = stage.inputs.length ? 1 + Math.max(...stage.inputs.map((key) => asap(byKey.get(key)))) : 0;
    depths.set(stage.key, depth);
    return depth;
  };
  stages.forEach(asap);

  // Then place every stage that feeds others as late as its consumers allow,
  // so side chains (substrate → gradient) enter right where they are used.
  [...stages]
    .sort((a, b) => depths.get(b.key) - depths.get(a.key))
    .forEach((stage) => {
      const consumers = children.get(stage.key);
      if (consumers.length) depths.set(stage.key, Math.min(...consumers.map((key) => depths.get(key))) - 1);
    });
  const sources = stages.filter((stage) => !stage.inputs.length);

  const columns = new Map();
  stages.forEach((stage) => {
    const depth = depths.get(stage.key);
    columns.set(depth, [...(columns.get(depth) ?? []), stage]);
  });

  // Lowest occupied row strictly between two columns (-1 if none).
  const rows = new Map();
  const lowestRowBetween = (from, to) => {
    let lowest = -1;
    for (let depth = from + 1; depth < to; depth += 1) {
      columns.get(depth)?.forEach((stage) => (lowest = Math.max(lowest, rows.get(stage.key))));
    }
    return lowest;
  };

  // Rows: each stage wants the average row of its inputs; sources go last.
  [...columns.keys()]
    .sort((a, b) => a - b)
    .forEach((depth) => {
      const wanted = columns
        .get(depth)
        .map((stage, order) => {
          if (!stage.inputs.length) return { stage, order, row: Infinity };
          let row = mean(stage.inputs.map((key) => rows.get(key)));
          const earliestInput = Math.min(...stage.inputs.map((key) => depths.get(key)));
          if (earliestInput < depth - 1) row = Math.max(row, lowestRowBetween(earliestInput, depth) + 1);
          return { stage, order, row };
        })
        .sort((a, b) => a.row - b.row || a.order - b.order);
      let next = 0;
      wanted.forEach(({ stage, row }) => {
        const placed = Number.isFinite(row) ? Math.max(row, next) : next;
        rows.set(stage.key, placed);
        next = placed + 1;
      });
    });

  // Center a source on its consumers when its column has room.
  sources.forEach((stage) => {
    const column = columns.get(depths.get(stage.key));
    if (column.length === 1) rows.set(stage.key, mean(children.get(stage.key).map((key) => rows.get(key))));
  });

  // Column widths follow their widest label.
  const maxDepth = Math.max(...depths.values());
  const columnX = [];
  const columnWidth = [];
  let x = PADDING;
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const labels = (columns.get(depth) ?? []).map((stage) => labelWidths[stage.key] ?? FALLBACK_LABEL_WIDTH);
    columnX.push(x);
    columnWidth.push(Math.max(MIN_COLUMN_WIDTH, ...labels));
    x += columnWidth[depth] + COLUMN_GAP;
  }

  const nodes = new Map();
  stages.forEach((stage) => {
    const depth = depths.get(stage.key);
    nodes.set(stage.key, {
      ...stage,
      depth,
      x: columnX[depth],
      width: columnWidth[depth],
      cx: columnX[depth] + columnWidth[depth] / 2,
      y: PADDING + rows.get(stage.key) * ROW_STEP,
    });
  });

  const maxRow = Math.max(...rows.values());
  return {
    nodes,
    columnX,
    width: x - COLUMN_GAP + PADDING,
    height: PADDING * 2 + maxRow * ROW_STEP + NODE_HEIGHT,
  };
}

/** Measures each rendered label (after webfonts load) so wires can stop just short of it. */
function useLabelWidths(rootRef) {
  const [widths, setWidths] = useState({});
  useLayoutEffect(() => {
    const measure = () => {
      const next = {};
      rootRef.current?.querySelectorAll('text[data-stage]').forEach((text) => {
        next[text.dataset.stage] = text.getComputedTextLength();
      });
      setWidths(next);
    };
    measure();
    let cancelled = false;
    document.fonts?.ready.then(() => !cancelled && measure());
    return () => {
      cancelled = true;
    };
  }, [rootRef]);
  return widths;
}

/** Interactive graph generated from the same stage definition as Debug.view. */
export function PipelineDiagram({ activeView = 'output', onSelectView }) {
  const rootRef = useRef(null);
  const probing = activeView !== 'output';
  const labelWidths = useLabelWidths(rootRef);
  const layout = useMemo(() => layoutStages(PIPELINE_STAGES, labelWidths), [labelWidths]);
  const edges = PIPELINE_STAGES.flatMap((stage) =>
    stage.inputs.map((input) => ({ from: layout.nodes.get(input), to: layout.nodes.get(stage.key) }))
  );
  const labelEdge = (node, side) =>
    node.cx + side * ((labelWidths[node.key] ?? FALLBACK_LABEL_WIDTH) / 2 + WIRE_GAP);

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
    <figure className="pipeline-diagram" ref={rootRef} aria-label="Render pipeline diagram">
      <figcaption className="pd-caption">
        <span className="pd-caption__title">
          Fig. 1 <em>— the watercolor pipeline</em>
        </span>
        <span className="pd-caption__probe">
          now showing <em>{probing ? activeView : 'the painting'}</em>
        </span>
      </figcaption>

      <svg
        className="pd-svg"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width={layout.width}
        height={layout.height}
      >
        <defs>
          {/* Ragged, slightly wavering edge for the brushstroke underline. */}
          <filter id="pd-brush" x="-20%" y="-150%" width="140%" height="400%">
            <feTurbulence type="fractalNoise" baseFrequency="0.06 0.5" numOctaves="2" seed="7" />
            <feDisplacementMap in="SourceGraphic" scale="4" />
          </filter>
        </defs>

        {edges.map(({ from, to }) => {
          const x1 = labelEdge(from, 1);
          const x2 = labelEdge(to, -1);
          const y1 = from.y + NODE_HEIGHT / 2;
          const y2 = to.y + NODE_HEIGHT / 2;
          // Wires turn just before the next column: at the target for neighbors,
          // right after the source for skips, which then run along their free lane.
          const turn = Math.max(x1, Math.min(layout.columnX[from.depth + 1] - JOIN_OFFSET, x2));
          return (
            <g key={`${from.key}-${to.key}`} className="pd-wire">
              <path d={`M ${x1} ${y1} H ${turn} V ${y2} H ${x2}`} />
              <circle cx={x2} cy={y2} r="1.3" />
            </g>
          );
        })}

        {[...layout.nodes.values()].map((stage) => {
          const clickable = Boolean(stage.debugView);
          const active = probing && stage.debugView === activeView;
          const { cx } = stage;
          const halfWidth = (labelWidths[stage.key] ?? FALLBACK_LABEL_WIDTH) / 2;
          const baseline = stage.y + NODE_HEIGHT / 2 + 4;
          const classes = ['pd-node', active && 'pd-node--active'].filter(Boolean).join(' ');

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
              <rect className="pd-node__hit" x={stage.x} y={stage.y} width={stage.width} height={NODE_HEIGHT} />
              <path
                className="pd-node__stroke"
                d={`M ${cx - halfWidth} ${baseline + 3} Q ${cx} ${baseline + 7} ${cx + halfWidth + 1} ${baseline + 2}`}
                filter="url(#pd-brush)"
              />
              <text data-stage={stage.key} x={cx} y={baseline}>
                {stage.label}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="pd-note">select a stage to view it; escape returns to the painting</p>
    </figure>
  );
}
