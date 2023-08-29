import { Text, Text3D, useTexture } from '@react-three/drei'
import Seats from '../components/Seats'
import Image from '../components/Image'

const Blurb = ({...props}) => {
  // Images
  const img = useTexture("./images/cat.jpg")

  return (
    <group {...props}>
      
      {/* Header */}
      <Text3D font="./fonts/Lato_Regular.json" size={1.5} height={0.12} position={[3.25, 1.8, -7]} rotation={[-Math.PI / 2, 0, 0]}>
        {"Header"}
      </Text3D>

      {/* Body */}
      <Text font="./fonts/Lato-Regular.ttf" fontSize={0.75} color="#ffffff" position={[3.15, 1.92, -5.75]} rotation={[-Math.PI / 2, 0, 0]} maxWidth={15} anchorX='left' anchorY='top' >
        {"Body"}
      </Text>

      {/* Header Icon */}
      <Image map={img} args={[1.6, 1.6]} position={[11.25, 1.92, -7.75]} rotation={[-Math.PI / 2, 0, 0]} />

    </group>
  )
}


const Default = ({ models, color = 'white', seatColor = 'white', header, body, texture, ...props }) => (
  <group {...props}>
    <models.Cabin color={color} />
    <Seats models={models} seatColor={seatColor} />
    <Blurb header={header} body={body} texture={texture} />
  </group>
)

export default Default
