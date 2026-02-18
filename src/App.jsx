import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  CANVAS_CAMERA,
  BACKGROUND_COLOR,
  BLEND_MODE,
  DEFAULT_RAW_WEIGHT,
  DEFAULT_BLINN_PHONG_WEIGHT,
  DEFAULT_BLUR_WEIGHT,
  DEFAULT_BLUR_STRENGTH,
} from './constants';
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
          rawWeight={DEFAULT_RAW_WEIGHT}
          blinnPhongWeight={DEFAULT_BLINN_PHONG_WEIGHT}
          blurWeight={DEFAULT_BLUR_WEIGHT}
          blurStrength={DEFAULT_BLUR_STRENGTH}
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
