import { useState } from 'react';
import './Plate.css';

/** Folded state survives reloads for this viewer; storage may be unavailable. */
function useFolded(storageKey) {
  const [folded, setFolded] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  });
  const toggle = () =>
    setFolded((value) => {
      try {
        localStorage.setItem(storageKey, value ? '0' : '1');
      } catch {
        // Folding still works for this visit.
      }
      return !value;
    });
  return [folded, toggle];
}

/**
 * A figure plate from a printed sketchbook on frosted vellum: a small-caps
 * caption whose title folds the body away (remembered under storageKey), with
 * an optional aside on the right, and an optional corner element (e.g. a
 * resize grip) that hides while folded. Shared by every overlay so they read
 * as one set of figures.
 */
export function Plate({
  id,
  className,
  title,
  subtitle,
  aside,
  corner,
  storageKey,
  rootRef,
  label,
  style,
  children,
}) {
  const [folded, toggleFolded] = useFolded(storageKey);

  return (
    <figure
      className={['plate', className, folded && 'plate--folded'].filter(Boolean).join(' ')}
      ref={rootRef}
      aria-label={label}
      style={style}
    >
      <figcaption className="plate__caption">
        <button
          type="button"
          className="plate__title"
          aria-expanded={!folded}
          aria-controls={id}
          title={folded ? 'unfold the figure' : 'fold the figure away'}
          onClick={toggleFolded}
        >
          <svg className="plate__fold" viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
            <path d="M 2 3.5 Q 3.9 5.2 5 6.9 Q 6.1 5.1 8 3.4" />
          </svg>
          {title} {subtitle && <em>{subtitle}</em>}
        </button>
        {aside && <span className="plate__aside">{aside}</span>}
      </figcaption>

      <div className="plate__body" id={id} inert={folded}>
        <div className="plate__inner">{children}</div>
      </div>
      {corner && !folded && corner}
    </figure>
  );
}
