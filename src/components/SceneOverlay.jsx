/**
 * Info overlay describing the blur pipeline. Purely presentational.
 */
export function SceneOverlay() {
  const lines = [
    '9-tap Separable Kernel',
    'Pass 1: Scene → Offscreen FBO',
    'Pass 2: Horizontal Blur → FBO',
    'Pass 3: Vertical Blur → Screen',
  ];

  return (
    <div className="scene-overlay" role="status" aria-label="Blur pipeline info">
      <div className="scene-overlay__title">🎨 Multi-Pass Gaussian Blur</div>
      <ul className="scene-overlay__list">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
