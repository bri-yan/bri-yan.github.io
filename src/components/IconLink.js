import UnderlinedText from "./UnderlinedText"
import Image from "./Image"
import { useEffect, useRef, useState } from "react"

const IconLink = ({ url = null, icon, font, fontSize, color, position, rotation, ...props }) => {
  // code for changing cursor and color
  const groupRef = useRef()

  const hoveredOver = () => {
    document.body.style.cursor = "pointer"
    groupRef.current.color = "black"
  }

  const hoveredOut = () => {
    document.body.style.cursor = "auto"
  }

  // link redirect function
  const handleClick = () => {
    if (url) {
      window.location = url; 
    }
  };

  // link props
  const text = props.children
  const iconPosition = [position[0] + fontSize / 2, position[1], position[2] + fontSize / 1.68]
  const textPosition = [position[0] + fontSize + 0.075, position[1], position[2]]

  return (
    <group {...props} ref={groupRef} onPointerDown={handleClick} onPointerOver={hoveredOver} onPointerOut={hoveredOut}> 
      <Image color={color} map={icon} args={[fontSize, fontSize]} position={iconPosition} rotation={rotation} />
      <UnderlinedText font={font} fontSize={fontSize} color={color} position={textPosition} rotation={rotation} >
        {text}
      </UnderlinedText>
    </group>
  )
}

export default IconLink