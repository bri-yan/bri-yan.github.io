import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PIPELINE_STAGES } from '../config';
import { Plate } from './Plate';
import './PipelineDiagram.css';

// Each stage is a label centered in its column, which is as wide as its widest
// label; wires run between the measured label ends, so there are no boxes.
const MIN_COLUMN_WIDTH = 36;
const FALLBACK_LABEL_WIDTH = 50; // until webfonts load and labels are measured
const NODE_HEIGHT = 20;
const COLUMN_GAP = 40;
const ROW_GAP = 12;
const PADDING = 8;
const WIRE_GAP = 6; // clearance kept around every label, by wires and bends alike
const DROP_RADIUS = 3.6; // the selected stage's pigment droplet
const DROP_OFFSET = WIRE_GAP + 3; // label edge to droplet center

const ROW_STEP = NODE_HEIGHT + ROW_GAP;
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * Layered left-to-right layout. Columns follow data depth, with each stage
 * as late as its consumers allow, so side inputs like the substrate enter
 * where they are used. Within a column, stages sit at the average row of
 * their inputs, so wires run straight or fan without crossing. A stage fed
 * across skipped columns (scene → specular) takes the clear row nearest its
 * inputs in every skipped column, else a free lane below them. A
 * side input (a source sharing its column, like the substrate) sits just above
 * its consumer's other inputs, and a stage alone in its column centers on the
 * stages it feeds.
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

  // A wire that skips columns runs along its consumer's row, so that row must
  // be clear in every skipped column: the clear row nearest the wanted one,
  // falling back to the lane below everything.
  const clearAcross = (from, to, row) => {
    for (let depth = from + 1; depth < to; depth += 1) {
      if (columns.get(depth)?.some((stage) => rows.has(stage.key) && Math.abs(rows.get(stage.key) - row) < 1)) {
        return false;
      }
    }
    return true;
  };
  const nearestLane = (from, to, wanted) => {
    const below = lowestRowBetween(from, to) + 1;
    let lane = below;
    for (let row = 0; row < below; row += 1) {
      if (clearAcross(from, to, row) && Math.abs(row - wanted) < Math.abs(lane - wanted)) lane = row;
    }
    return lane;
  };

  const isFree = (depth, row) =>
    row >= 0 && columns.get(depth).every((stage) => !rows.has(stage.key) || Math.abs(rows.get(stage.key) - row) >= 1);

  // Rows: each stage wants the average row of its inputs; sources come after.
  [...columns.keys()]
    .sort((a, b) => a - b)
    .forEach((depth) => {
      // A side source in the previous column that also feeds past this one
      // (substrate → output) keeps its own row free here as a straight lane,
      // and the stages it feeds here straddle that lane, half above and half
      // below (granulation above, dry brush below).
      const lanes = new Set();
      const straddle = new Map();
      const previous = columns.get(depth - 1) ?? [];
      previous.forEach((source) => {
        const sideSource = !source.inputs.length && previous.length > 1;
        if (!sideSource || !rows.has(source.key)) return;
        if (!children.get(source.key).some((key) => depths.get(key) > depth)) return;
        const fed = columns.get(depth).filter((stage) => stage.inputs.includes(source.key));
        if (!fed.length) return;
        const lane = rows.get(source.key);
        const half = Math.ceil(fed.length / 2);
        lanes.add(lane);
        fed.forEach((stage, index) => straddle.set(stage.key, index < half ? lane - (half - index) : lane + (index - half + 1)));
      });
      const wanted = columns
        .get(depth)
        .map((stage, order) => {
          if (!stage.inputs.length) return { stage, order, row: Infinity };
          if (straddle.has(stage.key)) return { stage, order, row: straddle.get(stage.key) };
          let row = mean(stage.inputs.map((key) => rows.get(key)));
          const earliestInput = Math.min(...stage.inputs.map((key) => depths.get(key)));
          if (earliestInput < depth - 1) row = nearestLane(earliestInput, depth, row);
          return { stage, order, row };
        })
        // Ties go to the stages straddling a lane, so they stay hugging it.
        .sort(
          (a, b) =>
            a.row - b.row ||
            straddle.has(b.stage.key) - straddle.has(a.stage.key) ||
            a.order - b.order
        );
      let next = 0;
      wanted.forEach(({ stage, row }) => {
        if (!Number.isFinite(row)) return;
        let placed = Math.max(row, next);
        while (lanes.has(placed)) placed += 1;
        rows.set(stage.key, placed);
        next = placed + 1;
      });
      // Side inputs join just above the consumer's other inputs, else go last.
      wanted.forEach(({ stage, row }) => {
        if (Number.isFinite(row)) return;
        const siblings = children
          .get(stage.key)
          .flatMap((key) => byKey.get(key).inputs)
          .filter((key) => key !== stage.key && rows.has(key));
        const above = siblings.length ? Math.min(...siblings.map((key) => rows.get(key))) - 1 : -1;
        const placed = isFree(depth, above) ? above : next;
        rows.set(stage.key, placed);
        next = Math.max(next, placed + 1);
      });
    });

  // A stage that branches sits midway between its outermost children (diffuse
  // between color override and dilution, substrate between its wire into
  // output and dry brush), as does a stage alone in its column. Right to left
  // so each centers on already-settled children; a stage sharing its column
  // only moves where that row is free.
  [...stages]
    .filter((stage) => {
      const fed = children.get(stage.key).length;
      return fed > 1 || (fed && columns.get(depths.get(stage.key)).length === 1);
    })
    .sort((a, b) => depths.get(b.key) - depths.get(a.key))
    .forEach((stage) => {
      const fed = children.get(stage.key).map((key) => rows.get(key));
      const row = (Math.min(...fed) + Math.max(...fed)) / 2;
      const depth = depths.get(stage.key);
      const clear = columns
        .get(depth)
        .every((other) => other === stage || Math.abs(rows.get(other.key) - row) >= 1);
      if (clear) rows.set(stage.key, row);
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
    columnWidth,
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

/**
 * Interactive graph generated from the same stage definition as Debug.view.
 * Set on the shared figure plate (Fig. 1); its pigment accents follow the
 * base pigment color inherited as --plate-wash.
 */
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
      if (event.target.closest?.('.debug-panel, [class*="leva"]')) return;
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
    <Plate
      id="pd-plate"
      className="pipeline-diagram"
      rootRef={rootRef}
      label="Render pipeline diagram"
      storageKey="pipeline-diagram-collapsed"
      title="Fig. 1"
      subtitle="— the watercolor pipeline"
      aside={
        <>
          now showing <em>{probing ? activeView.replaceAll('-', ' ') : 'the painting'}</em>
        </>
      }
    >
      <svg
        className="pd-svg"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width={layout.width}
        height={layout.height}
      >
        <defs>
          {/* A watercolor droplet's edge: round, but never quite a circle. */}
          <filter id="pd-drop" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency="0.2" numOctaves="2" seed="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" />
          </filter>
        </defs>

        {edges.map(({ from, to }) => {
          const x1 = labelEdge(from, 1);
          const x2 = labelEdge(to, -1);
          const y1 = from.y + NODE_HEIGHT / 2;
          const y2 = to.y + NODE_HEIGHT / 2;
          // Every bend lives in the gap after the source's column, clear of the
          // widest label on either side, so wires sharing a gap bend together
          // and never touch a label. Skips then run along their free lane.
          const bendStart = layout.columnX[from.depth] + layout.columnWidth[from.depth] + WIRE_GAP;
          const bendEnd = layout.columnX[from.depth + 1] - WIRE_GAP;
          const handle = (bendEnd - bendStart) / 2;
          const d =
            Math.abs(y2 - y1) < 0.5
              ? `M ${x1} ${y1} H ${x2}`
              : `M ${x1} ${y1} H ${bendStart} C ${bendStart + handle} ${y1}, ${bendEnd - handle} ${y2}, ${bendEnd} ${y2} H ${x2}`;
          return <path key={`${from.key}-${to.key}`} className="pd-wire" d={d} />;
        })}

        {[...layout.nodes.values()].map((stage) => {
          const clickable = Boolean(stage.debugView);
          const active = stage.debugView === activeView;
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
              {/* The incoming wires land in the drop, just before the label. */}
              <g className="pd-node__drop" filter="url(#pd-drop)">
                <circle cx={cx - halfWidth - DROP_OFFSET} cy={stage.y + NODE_HEIGHT / 2} r={DROP_RADIUS} />
                <circle
                  className="pd-node__glint"
                  cx={cx - halfWidth - DROP_OFFSET - 0.8}
                  cy={stage.y + NODE_HEIGHT / 2 - 1}
                  r="1"
                />
              </g>
              <text data-stage={stage.key} x={cx} y={baseline}>
                {stage.label}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="pd-note">select a stage to view it; escape returns to the painting</p>
    </Plate>
  );
}
