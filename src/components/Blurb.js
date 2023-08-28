import { Text, Text3D } from '@react-three/drei'

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
  
export default Blurb