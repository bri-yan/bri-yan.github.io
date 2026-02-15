import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const TORUS_ROTATION_SPEED_X = 0.3;
const TORUS_ROTATION_SPEED_Y = 0.5;

export function TorusScene() {
  const torusRef = useRef();

  useFrame((state) => {
    if (torusRef.current) {
      const t = state.clock.elapsedTime;
      torusRef.current.rotation.x = t * TORUS_ROTATION_SPEED_X;
      torusRef.current.rotation.y = t * TORUS_ROTATION_SPEED_Y;
    }
  });

  return (
    <>
      <ambientLight intensity={2} />
      {/* <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#ff00ff" /> */}

      <mesh ref={torusRef}>
        <torusGeometry args={[1, 0.4, 32, 100]} />
        <meshStandardMaterial
          color="#00ffff"
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[-2.5, 0, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#ff6b6b" />
      </mesh>

      <mesh position={[2.5, 0, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color="#4ecdc4" />
      </mesh>
    </>
  );
}
