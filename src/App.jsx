import { useLayoutEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CANVAS_CAMERA } from './config';
import { MultiPassPipeline } from './pipeline';
import { useRenderDpr } from './pipeline/utils/viewScale';
import { ContainFit, DebugPanel, SmoothZoom, TorusKnotScene } from './components';
import { usePipelineControls } from './dev/usePipelineControls';
import './App.css';

// Only fullscreen quads reach the screen, so its buffer needs no multisampling
// or depth.
const GL_OPTIONS = { antialias: false, depth: false };

export default function App() {
  const controls = usePipelineControls();
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
          <TorusKnotScene />
          <OrbitControls makeDefault enableDamping dampingFactor={0.05} enableZoom={false} />
          <SmoothZoom />
          <ContainFit />
        </MultiPassPipeline>
      </Canvas>
      <DebugPanel />
    </div>
  );
}
