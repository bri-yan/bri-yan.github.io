import { useEffect, useRef, useState } from 'react';
import { Leva } from 'leva';
import { Plate } from './Plate';
import './DebugPanel.css';

const INK = 'var(--plate-ink)';
const INK_SOFT = 'var(--plate-ink-soft)';
const WASH_INK = 'var(--plate-wash-ink)';

/**
 * Leva's Stitches tokens mapped onto the plate: paper and ink instead of
 * Leva's dark UI, pigment accents (slider fills, focus, active states) that
 * follow the base color live through CSS variables, and the figure's type.
 */
const PLATE_THEME = {
  colors: {
    // The panel and folders are clear so the plate's vellum shows through;
    // fields, scrubbers and the select get a faint ink tint.
    elevation1: 'transparent',
    elevation2: 'transparent',
    elevation3: 'rgba(59, 49, 41, 0.07)',
    accent1: `color-mix(in oklab, ${WASH_INK} 80%, ${INK})`,
    accent2: WASH_INK,
    accent3: `color-mix(in oklab, ${WASH_INK} 70%, var(--plate-paper))`,
    highlight1: 'rgba(59, 49, 41, 0.28)',
    highlight2: INK_SOFT,
    highlight3: INK,
    vivid1: WASH_INK,
    folderWidgetColor: INK_SOFT,
    folderTextColor: INK,
    toolTipBackground: INK,
    toolTipText: 'var(--plate-paper)',
  },
  radii: { xs: '1px', sm: '2px', lg: '2px' },
  // No grid gap between rows: DebugPanel.css pads each ledger row evenly instead.
  space: { rowGap: '0px', colGap: '10px' },
  fonts: {
    mono: "'Cormorant SC', 'EB Garamond', serif",
    sans: "'Cormorant SC', 'EB Garamond', serif",
  },
  fontSizes: { root: '13px' },
  sizes: { rootWidth: '100%', controlWidth: '130px', rowHeight: '24px', folderTitleHeight: '22px' },
  shadows: { level1: 'none', level2: '0 4px 14px rgba(59, 49, 41, 0.18)' },
  borderWidths: { input: '0.5px', focus: '1px', hover: '0.5px', active: '1px', folder: '0.5px' },
  fontWeights: { label: '400', folder: '600', button: '600' },
};

const FRAME_KEY = 'debug-panel-frame';
const EDGE = 12; // the plates' margin from the window edge
const MIN_WIDTH = 260;
const MIN_BODY_HEIGHT = 120;
const KEY_STEP = 10;
const DRAG_THRESHOLD = 4; // px before a caption press becomes a drag instead of a click
const CAPTION_VISIBLE = 40; // the caption always stays this far inside the bottom edge
const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Keeps the panel inside the same inset from the window edge that the
 * pipeline plate sits at (EDGE from the top and left; mirrored on the right
 * and bottom, where the caption stays reachable).
 */
const bounded = (left, top, width) => ({
  left: clamp(left, EDGE, window.innerWidth - EDGE - width),
  top: clamp(top, EDGE, window.innerHeight - EDGE - CAPTION_VISIBLE),
});

function loadFrame() {
  try {
    return JSON.parse(localStorage.getItem(FRAME_KEY)) ?? null;
  } catch {
    return null;
  }
}

function saveFrame(frame) {
  try {
    if (frame) localStorage.setItem(FRAME_KEY, JSON.stringify(frame));
    else localStorage.removeItem(FRAME_KEY);
  } catch {
    // Moving and resizing still work for this visit.
  }
}

/**
 * Where the panel sits and how big it is, once the viewer moves or resizes
 * it ({ left, top, width, bodyHeight }; null = docked top-right at the CSS
 * size). Remembered per viewer and kept on screen as the window changes.
 */
function usePanelFrame(rootRef) {
  const [frame, setFrame] = useState(loadFrame);
  const [, setViewport] = useState(0);
  const justDragged = useRef(false);

  useEffect(() => {
    const onResize = () => setViewport((count) => count + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const measure = () => {
    const rect = rootRef.current.getBoundingClientRect();
    const body = rootRef.current.querySelector('.plate__inner').getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, bodyHeight: body.height };
  };

  // Pointer drags: 'move' shifts the panel from anywhere on the caption row
  // (it starts only after DRAG_THRESHOLD px, so the title still folds on a
  // click); 'resize' pulls the bottom-left corner, so the right edge and top
  // stay put.
  const startDrag = (mode) => (event) => {
    if (event.button !== 0) return;
    const start = { ...measure(), x: event.clientX, y: event.clientY };
    let latest = null;
    let dragging = mode === 'resize';
    justDragged.current = false;
    if (dragging) event.preventDefault();
    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - start.x;
      const dy = moveEvent.clientY - start.y;
      if (!dragging) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        dragging = true;
      }
      if (mode === 'move') {
        justDragged.current = true;
        latest = {
          ...frame,
          ...bounded(start.left + dx, start.top + dy, frame?.width ?? start.width),
        };
      } else {
        const width = clamp(start.width - dx, MIN_WIDTH, start.left + start.width - EDGE);
        latest = {
          left: start.left + start.width - width,
          top: start.top,
          width,
          bodyHeight: Math.max(start.bodyHeight + dy, MIN_BODY_HEIGHT),
        };
      }
      setFrame(latest);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (latest) saveFrame(latest);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  // A drag that ends over the title must not also fold the plate.
  const swallowDragClick = (event) => {
    if (!justDragged.current) return;
    justDragged.current = false;
    event.stopPropagation();
    event.preventDefault();
  };

  const nudge = (event) => {
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!step) return;
    event.preventDefault();
    const { left, top } = frame?.left != null ? frame : measure();
    const next = { ...frame, left: left + step[0] * KEY_STEP, top: top + step[1] * KEY_STEP };
    setFrame(next);
    saveFrame(next);
  };

  const reset = () => {
    setFrame(null);
    saveFrame(null);
  };

  // Clamped at render so a smaller window never strands the panel off screen.
  const style = {};
  if (frame) {
    const width = Math.min(frame.width ?? 320, window.innerWidth - 2 * EDGE);
    if (frame.width != null) style.width = width;
    if (frame.left != null) {
      const { left, top } = bounded(frame.left, frame.top, width);
      style.left = left;
      style.right = 'auto';
      style.top = top;
      style['--dp-top'] = `${top}px`;
    }
    if (frame.bodyHeight != null) style['--dp-body-height'] = `${frame.bodyHeight}px`;
  }

  return { style, startDrag, swallowDragClick, nudge, reset };
}

/**
 * The Leva controls as Fig. 2, docked opposite the pipeline graph. Dragging
 * the caption moves it, within the same inset from the window edge as Fig. 1
 * (the dotted grip also takes arrow keys; double-click re-docks), and the
 * inked corner at the bottom left resizes it.
 */
export function DebugPanel() {
  const rootRef = useRef(null);
  const { style, startDrag, swallowDragClick, nudge, reset } = usePanelFrame(rootRef);

  return (
    <Plate
      id="dp-plate"
      className="debug-panel"
      rootRef={rootRef}
      style={style}
      label="Debug controls"
      storageKey="debug-panel-collapsed"
      title="Fig. 2"
      subtitle="— the controls"
      captionProps={{ onPointerDown: startDrag('move'), onClickCapture: swallowDragClick }}
      aside={
        <span
          className="dp-grip dp-grip--move"
          role="button"
          tabIndex={0}
          aria-label="Move the controls (arrow keys); double-click to dock"
          title="drag the caption to move · double-click to dock"
          onKeyDown={nudge}
          onDoubleClick={reset}
        >
          <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
            {[2, 5, 8].map((x) =>
              [3.5, 6.5].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" />)
            )}
          </svg>
        </span>
      }
      corner={
        <span
          className="dp-grip dp-grip--resize"
          aria-hidden="true"
          title="drag to resize"
          onPointerDown={startDrag('resize')}
        >
          <svg viewBox="0 0 10 10" width="10" height="10">
            <path d="M 1.5 3 L 7 8.5 M 1.5 6.2 L 3.8 8.5" />
          </svg>
        </span>
      }
    >
      <Leva fill flat titleBar={false} hideCopyButton theme={PLATE_THEME} />
    </Plate>
  );
}
