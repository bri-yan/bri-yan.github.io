import { useLayoutEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CANVAS_CAMERA } from './config';
import { MultiPassPipeline } from './pipeline';
import { DebugPanel, PipelineDiagram, TorusKnotScene } from './components';
import { usePipelineControls } from './dev/usePipelineControls';
import './App.css';

export default function App() {
  const { setDebugView, ...controls } = usePipelineControls();

  // Every plate's pigment accents follow the base color. Set on <html> so
  // Leva's popovers, portaled outside the app, pick it up too.
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--plate-wash', controls.colorOverrideBaseColor);
  }, [controls.colorOverrideBaseColor]);

  return (
    <div className="app">
      <Canvas camera={CANVAS_CAMERA} dpr={[1, 2]}>
        <MultiPassPipeline {...controls}>
          <TorusKnotScene />
          <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
        </MultiPassPipeline>
      </Canvas>
      <PipelineDiagram activeView={controls.debugView} onSelectView={setDebugView} />
      <DebugPanel />
    </div>
  );
}
