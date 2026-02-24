import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const ROTATION_SPEED_X = 0;
const ROTATION_SPEED_Y = 0;

export function TorusKnotScene() {
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
        <torusKnotGeometry args={[1, 0.4, 100, 16]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>
    </>
  );
}
