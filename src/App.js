import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useScroll, ScrollControls, Environment, Merged, MeshReflectorMaterial } from '@react-three/drei'
import About from "./cabins/About"
import Default from './cabins/Default'
import Title from './components/Title'

function Train() {
  // setup
  const mounted = useRef(false)
  const ref = useRef()
  const scroll = useScroll()
  const [cabin, seat] = useGLTF(['./models/cabin-transformed.glb', './models/seat-transformed.glb'])
  const meshes = useMemo(() => ({ Cabin: cabin.nodes.cabin_1, Seat: seat.nodes.seat }), [cabin, seat])
  
  // train details
  const start = 11
  const spacing = 26

  // scroll function
  useFrame(() => {
    if (!mounted.current) {
      if (cabin && seat) {
        mounted.current = true
      }
    }
    else {
      ref.current.position.z = -scroll.offset * 120
      ref.current.position.x = -8
    }
  })

  // Merged creates THREE.InstancedMeshes out of the meshes you feed it
  // All in all we end up with just 5 draw-calls for the entire scene
  return (
    <Merged castShadow receiveShadow meshes={meshes}>
      {(models) => (
        <group ref={ref}>
          <Title start={start} />
          <About models={models} color="#252525" seatColor="sandybrown" position={[0, 0, start]}/>
          <Default models={models} color="#454545" seatColor="gray" position={[0, 0, start + spacing]} />
          <Default models={models} color="#252525" seatColor="lightskyblue" name="Projects" position={[0, 0, start + spacing * 2]} />
          <Default models={models} color="#454545" seatColor="gray" name="Education" position={[0, 0, start + spacing * 3]} />
          <Default models={models} color="#252525" seatColor="sandybrown" name="Contact" position={[0, 0, start + spacing * 4]} />
        </group>
      )}
    </Merged>
  )
}

export default function App() {
  return (
    <Canvas dpr={[1, 1.5]} shadows camera={{ position: [-12, 18, 18], fov: 35 }} gl={{ alpha: false }}>
      {/* TO-DO: Determine fog intensity/necessity */}
      {/* <fog attach="fog" args={['#17171b', 30, 40]} /> */}
      <color attach="background" args={['#17171b']} />
      <ambientLight intensity={0.25} />
      <directionalLight castShadow intensity={2} position={[10, 6, 6]} shadow-mapSize={[1024, 1024]}>
        <orthographicCamera attach="shadow-camera" left={-20} right={20} top={20} bottom={-20} />
      </directionalLight>
      <Suspense fallback={null}>
        <ScrollControls pages={3}>
          <Train />
        </ScrollControls>
        <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100, 100]} />
          <MeshReflectorMaterial
            blur={[400, 100]}
            resolution={1024}
            mixBlur={1}
            mixStrength={15}
            depthScale={1}
            minDepthThreshold={0.85}
            color="#151515"
            metalness={0.6}
            roughness={1}
          />
        </mesh>
        <Environment preset="dawn" />
      </Suspense>
    </Canvas>
  )
}
