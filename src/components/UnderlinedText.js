import { Text } from "@react-three/drei"

const UnderlinedText = ({ font, fontSize, color, position, rotation, offset = 0, lengthOffset = 0, ...props }) => {
  const text = props.children
  const underlineLength = text.length * fontSize * 0.48 + lengthOffset
  const textPosition = position
  const underlinePosition = [(position[0] + underlineLength) / 1.51 + offset, position[1], position[2] + fontSize]

  return (
    <group {...props}>
      <Text font={font} fontSize={fontSize} color={color} position={textPosition} rotation={rotation} maxWidth={15} anchorX='left' anchorY='top' >
        {text}
      </Text>
      <mesh position={underlinePosition} rotation={rotation}>
        <planeBufferGeometry args={[underlineLength, fontSize * 0.05]} /> 
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

export default UnderlinedText