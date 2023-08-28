/* TO-DO: 
 * Create separate cabins for separate sections
 * Add title
 * Add links to about me
 * Figure out how to add pics
 * Reverse scroll and start from other end
 * Change background colour
 * Change camera angle on-click
 * Make camera slightly follow mouse
 * Change train model
 */

/* Notes:
 * Top-down view can be achieved with [0, y, 0]
 */
import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useScroll, ScrollControls, Environment, Merged, Text, Text3D, MeshReflectorMaterial, Plane, useTexture } from '@react-three/drei'
import About from "./cabins/About"

function Train() {
  const mounted = useRef(false)
  const ref = useRef()
  const scroll = useScroll()
  const [cabin, seat] = useGLTF(['/cabin-transformed.glb', '/seat-transformed.glb'])
  const meshes = useMemo(() => ({ Cabin: cabin.nodes.cabin_1, Seat: seat.nodes.seat }), [cabin, seat])
  const popcat = useTexture("./popcat.png")
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
          <About models={models} color="#252525" seatColor="sandybrown" position={[0, 0, 0]}
            header="About Me"
            body={"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed dapibus sodales purus, quis malesuada ex dignissim sit amet.\n\nFusce id risus nec justo laoreet sollicitudin et eu urna. Nulla porttitor posuere sem, ut vulputate lorem maximus eget. In hac habitasse platea dictumst. Morbi blandit ex quis viverra lobortis. Vestibulum accumsan, ipsum ac ultricies gravida, lacus mauris viverra ligula, convallis accumsan odio ante eu enim. Curabitur suscipit tellus ac viverra sodales. Nunc vitae mauris sollicitudin, molestie urna congue, rutrum sem.\n\nProin vel magna volutpat, volutpat metus sed, pharetra sapien. Etiam placerat eget ipsum eget ultricies."}
            texture={popcat}
          />
          <Cabin models={models} color="#454545" seatColor="gray" position={[0, 0, 26]} 
            header="Experience"
            body={""}
          />
          <Cabin models={models} color="#252525" seatColor="lightskyblue" name="Projects" position={[0, 0, 52]} />
          <Cabin models={models} color="#454545" seatColor="gray" name="Education" position={[0, 0, 78]} />
          <Cabin models={models} color="#252525" seatColor="sandybrown" name="Contact" position={[0, 0, 104]} />
        </group>
      )}
    </Merged>
  )
}

const Quarter = ({ models, color, ...props }) => (
  <group {...props}>
    <models.Seat color={color} position={[-0.35, 0, 0.7]} />
    <models.Seat color={color} position={[0.35, 0, 0.7]} />
    <models.Seat color={color} position={[-0.35, 0, -0.7]} rotation={[0, Math.PI, 0]} />
    <models.Seat color={color} position={[0.35, 0, -0.7]} rotation={[0, Math.PI, 0]} />
  </group>
)

const Row = ({ models, color, ...props }) => (
  <group {...props}>
    <Quarter models={models} color={color} position={[-1.2, -0.45, 9.75]} />
    <Quarter models={models} color={color} position={[1.2, -0.45, 9.75]} />
  </group>
)

const Blurb = ({header, body, texture, ...props }) => (
  <group {...props}>
    <Text3D
      font="./Lato_Regular.json" size={1.5} height={0.12} position={[3.25, 1.8, -7]} rotation={[-Math.PI / 2, 0, 0]}
    >
      {header}
    </Text3D>
    <Text font="./Lato-Regular.ttf" fontSize={0.75} color="#ffffff" position={[3.15, 1.92, -5.75]} rotation={[-Math.PI / 2, 0, 0]} maxWidth={15} anchorX='left' anchorY='top' >
      {body}
    </Text>
    <mesh position={[3.15, 2.5, -5.75]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeBufferGeometry args={[10, 10]} />
      <meshStandardMaterial map={texture} transparent repeat={[2,1]} />
    </mesh>
  </group>
)

const Cabin = ({ models, color = 'white', seatColor = 'white', header, body, texture, ...props }) => (
  <group {...props}>
    <Blurb header={header} body={body} texture={texture} />
    <models.Cabin color={color} />
    <Row models={models} color={seatColor} />
    <Row models={models} color={seatColor} position={[0, 0, -1.9]} />
    <Row models={models} color={seatColor} position={[0, 0, -6.6]} />
    <Row models={models} color={seatColor} position={[0, 0, -8.5]} />
    <Row models={models} color={seatColor} position={[0, 0, -11]} />
    <Row models={models} color={seatColor} position={[0, 0, -12.9]} />
    <Row models={models} color={seatColor} position={[0, 0, -17.6]} />
    <Row models={models} color={seatColor} position={[0, 0, -19.5]} />
  </group>
)



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
          <planeGeometry args={[50, 50]} />
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
