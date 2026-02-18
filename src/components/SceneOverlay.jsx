/**
 * Info overlay describing the multi-pass pipeline (BlinnPhong + Blur + Compositor).
 * Purely presentational.
 */
export function SceneOverlay() {
  const lines = [
    'Pass 1: Scene → BlinnPhong lighting → FBO (sharp + lit)',
    'Pass 2: Scene → FBO → 9-tap separable blur (H then V) → FBO',
    'Pass 3: Compositor blends both FBOs (weights + additive/multiply/screen) → screen',
  ];

  return (
    <div className="scene-overlay" role="status" aria-label="Multi-pass pipeline info">
      <div className="scene-overlay__title">Multi-Pass Pipeline</div>
      <ul className="scene-overlay__list">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
