import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Leva } from 'leva';
import { CANVAS_CAMERA } from './config';
import { MultiPassPipeline } from './pipeline';
import { TorusKnotScene, PipelineDiagram } from './components';
import { usePipelineControls } from './dev/usePipelineControls';
import './App.css';

export default function App() {
  const { setDebugView, ...controls } = usePipelineControls();

  return (
    <div className="app">
      <Leva />
      <Canvas camera={CANVAS_CAMERA} dpr={[1, 2]}>
        <MultiPassPipeline {...controls}>
          <TorusKnotScene />
          <OrbitControls enableDamping dampingFactor={0.05} />
        </MultiPassPipeline>
      </Canvas>
      <PipelineDiagram
        activeView={controls.debugView}
        weights={{
          edge: controls.edgeWeight,
          body: controls.bodyWeight,
          diffuse: controls.diffuseWeight,
          specular: controls.specularWeight,
          blur: controls.blurWeight,
          paper: controls.edgePaperWeight,
          diffuseGain: controls.diffuseGain,
        }}
        onSelectView={setDebugView}
      />
    </div>
  );
}
