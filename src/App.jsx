import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BlurPass } from './components/BlurPass';
import { TorusScene } from './components/TorusScene';
import { SceneOverlay } from './components/SceneOverlay';
import './App.css';

const CANVAS_CAMERA = { position: [0, 0, 5], fov: 75 };
const BACKGROUND_COLOR = '#f2f2f2';

export default function App() {
  return (
    <div className="app">
      <Canvas camera={CANVAS_CAMERA} dpr={[1, 2]}>
        <color attach="background" args={[BACKGROUND_COLOR]} />
        <BlurPass>
          <TorusScene />
          <OrbitControls enableDamping dampingFactor={0.05} />
        </BlurPass>
      </Canvas>
      <SceneOverlay />
    </div>
  );
}
