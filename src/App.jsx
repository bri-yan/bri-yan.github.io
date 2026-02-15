import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { MultiPassPipeline } from './components/MultiPassPipeline';
import { TorusScene } from './components/TorusScene';
import { SceneOverlay } from './components/SceneOverlay';
import './App.css';

const CANVAS_CAMERA = { position: [0, 0, 5], fov: 75 };
const BACKGROUND_COLOR = '#ffffff';

export default function App() {
  return (
    <div className="app">
      <Canvas camera={CANVAS_CAMERA} dpr={[1, 2]}>
        <color attach="background" args={[BACKGROUND_COLOR]} />
        <MultiPassPipeline
          blinnPhongWeight={0.6}
          blurWeight={0.4}
          blendMode={0} // 0 = additive, 1 = multiply, 2 = screen
        >
          <TorusScene />
          <OrbitControls enableDamping dampingFactor={0.05} />
        </MultiPassPipeline>
      </Canvas>
      <SceneOverlay />
    </div>
  );
}
