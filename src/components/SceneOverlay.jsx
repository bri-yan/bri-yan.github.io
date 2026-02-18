const PIPELINE_STEPS = [
  'Pass 1: Scene → Raw (unlit base color) → FBO',
  'Pass 2: Scene → BlinnPhong lighting → FBO (sharp + lit)',
  'Pass 3: Scene → FBO → 9-tap separable blur (H then V) → FBO',
  'Pass 4: Compositor blends all three FBOs (weights + blend mode) → screen',
];

/** Presentational overlay describing the multi-pass pipeline. */
export function SceneOverlay() {
  return (
    <div className="scene-overlay" role="status" aria-label="Multi-pass pipeline info">
      <div className="scene-overlay__title">Multi-Pass Pipeline</div>
      <ul className="scene-overlay__list">
        {PIPELINE_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
    </div>
  );
}
