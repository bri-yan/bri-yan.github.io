const PIPELINE_STEPS = [
  'Pass 1: Scene → Intensity (mask) → FBO',
  'Pass 2: Intensity → Blur → FlowPattern → FBO',
  'Pass 3a: Scene → Diffuse (ambient+Lambertian) → FBO',
  'Pass 3b: Scene → Specular (Blinn-Phong) → FBO',
  'Pass 4: Compositor blends FlowPattern, Diffuse+Specular, Blur FBOs → screen',
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
