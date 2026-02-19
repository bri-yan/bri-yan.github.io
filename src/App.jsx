import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  CANVAS_CAMERA,
  BACKGROUND_COLOR,
  BLEND_MODE,
  DEFAULT_FLOW_PATTERN_WEIGHT,
  DEFAULT_BLINN_PHONG_WEIGHT,
  DEFAULT_BLUR_WEIGHT,
  DEFAULT_BLUR_STRENGTH,
  DEFAULT_BLUR_ITERATIONS,
} from './config';
import { MultiPassPipeline } from './pipeline';
import { TorusScene, SceneOverlay } from './components';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <Canvas camera={CANVAS_CAMERA} dpr={[1, 2]}>
        <color attach="background" args={[BACKGROUND_COLOR]} />
        <MultiPassPipeline
          flowPatternWeight={DEFAULT_FLOW_PATTERN_WEIGHT}
          blinnPhongWeight={DEFAULT_BLINN_PHONG_WEIGHT}
          blurWeight={DEFAULT_BLUR_WEIGHT}
          blurStrength={DEFAULT_BLUR_STRENGTH}
          blurIterations={DEFAULT_BLUR_ITERATIONS}
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
