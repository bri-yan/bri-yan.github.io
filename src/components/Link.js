import UnderlinedText from "./UnderlinedText"
import { useRef } from "react"

const Link = ({ url = null, font, fontSize, color, position, rotation, ...props }) => {
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

  return (
    <group {...props} ref={groupRef} onPointerDown={handleClick} onPointerOver={hoveredOver} onPointerOut={hoveredOut}> 
      <UnderlinedText font={font} fontSize={fontSize} color={color} position={position} rotation={rotation} >
        {text}
      </UnderlinedText>
    </group>
  )
}

export default Link