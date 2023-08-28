import { Text3D } from '@react-three/drei'

const Title = ({ start, title, ...props }) => (
  <group {...props}>
    <Text3D font="./fonts/Lato_Regular.json" size={2.7} height={0.2} position={[-2.2, 1.8, start - 11.75]} rotation={[-Math.PI / 2, 0, 0]}>
      {"BRIAN  YAN"}
    </Text3D>
  </group>
)

export default Title