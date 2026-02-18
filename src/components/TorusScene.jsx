import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const ROTATION_SPEED_X = 0.3;
const ROTATION_SPEED_Y = 0.5;

export function TorusScene() {
  const meshRef = useRef();

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.x = t * ROTATION_SPEED_X;
    meshRef.current.rotation.y = t * ROTATION_SPEED_Y;
  });

  return (
    <>
      <mesh ref={meshRef}>
        <torusGeometry args={[1, 0.4, 32, 100]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>
      <mesh position={[-2.5, 0, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color="#ff6b6b" />
      </mesh>
      <mesh position={[2.5, 0, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshBasicMaterial color="#ff00ff" />
      </mesh>
    </>
  );
}
