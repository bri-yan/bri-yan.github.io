import { useLayoutEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CANVAS_CAMERA } from './config';
import { MultiPassPipeline } from './pipeline';
import { useRenderDpr } from './pipeline/utils/viewScale';
import { ContainFit, DebugPanel, SmoothZoom, ViewCamera, ViewScene, ViewTransition } from './components';
import { usePipelineControls } from './dev/usePipelineControls';
import { DEFAULT_VIEW, getView } from './views';
import './App.css';

// Only fullscreen quads reach the screen, so its buffer needs no multisampling
// or depth.
const GL_OPTIONS = { antialias: false, depth: false };

export default function App() {
  const { view: viewId, ...controls } = usePipelineControls();
  const view = getView(viewId) ?? DEFAULT_VIEW;
  // The painting shows `shown` until it has been unpainted to bare paper, then
  // switches to `view` (ViewTransition).
  const [shown, setShown] = useState(view);
  const dpr = useRenderDpr();

  // Every plate's pigment accents follow the base color. Set on <html> so
  // Leva's popovers, portaled outside the app, pick it up too.
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--plate-wash', controls.colorOverrideBaseColor);
  }, [controls.colorOverrideBaseColor]);

  // Frames render on demand: when the view, a control, or the cursor moves.
  return (
    <div className="app">
      <Canvas camera={CANVAS_CAMERA} dpr={dpr} gl={GL_OPTIONS} frameloop="demand">
        <MultiPassPipeline {...controls}>
          <ViewScene key={shown.id} view={shown} />
          <ViewTransition target={view} shown={shown} onSwap={setShown} />
          <OrbitControls makeDefault enableDamping dampingFactor={0.05} enableZoom={false} />
          <SmoothZoom />
          <ViewCamera view={shown} />
          <ContainFit />
        </MultiPassPipeline>
      </Canvas>
      <DebugPanel />
    </div>
  );
}
