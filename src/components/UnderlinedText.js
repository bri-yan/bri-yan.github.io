import { Text } from "@react-three/drei"
import { useState, useRef, useEffect,   useLayoutEffect } from "react"
import { Box3 } from "three"

const UnderlinedText = ({ font, fontSize, color, position, rotation, ...props }) => {
  const textRef = useRef()
  const [measuredLength, setMeasuredLength] = useState(null)
  const text = props.children

  const textPosition = position
  const underlinePosition = [position[0] + (measuredLength ?? 0) / 1.99, position[1], position[2] + fontSize]

  const updateLength = () => {
    const bounds = new Box3().setFromObject(textRef.current)
    setMeasuredLength(bounds.max.x - bounds.min.x)
  }
  
  return (
    <group {...props} >

      {/* 2D Text */}
      <Text font={font} fontSize={fontSize} color={color} position={textPosition} rotation={rotation} maxWidth={15} anchorX='left' anchorY='top' ref={textRef} onAfterRender={updateLength} >
        {text}
      </Text>

      {/* Underline */}
      <mesh position={underlinePosition} rotation={rotation}>
        <planeBufferGeometry args={[measuredLength, fontSize * 0.05]} /> 
        <meshStandardMaterial color={color} />
      </mesh>

    </group>
  )
}

export default UnderlinedText