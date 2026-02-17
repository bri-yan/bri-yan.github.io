import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CANVAS_CAMERA, BACKGROUND_COLOR, BLEND_MODE } from './constants';
import { MultiPassPipeline } from './components/MultiPassPipeline';
import { TorusScene } from './components/TorusScene';
import { SceneOverlay } from './components/SceneOverlay';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <Canvas camera={CANVAS_CAMERA} dpr={[1, 2]}>
        <color attach="background" args={[BACKGROUND_COLOR]} />
        <MultiPassPipeline
          blinnPhongWeight={1.0}
          blurWeight={1.0}
          blendMode={BLEND_MODE.ADDITIVE}
        >
          <TorusScene />
          <OrbitControls enableDamping dampingFactor={0.05} />
        </MultiPassPipeline>
      </Canvas>
      <SceneOverlay />
    </div>
  );
}
