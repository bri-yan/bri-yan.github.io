import UnderlinedText from "./UnderlinedText"
import Image from "./Image"

const IconLink = ({ icon, font, fontSize, color, position, rotation, ioffset = 0, ...props }) => {
  const text = props.children
  const iconPosition = [position[0] + fontSize / 2, position[1], position[2] + fontSize / 1.68]
  const textPosition = [position[0] + fontSize, position[1], position[2]]
  const url = "https://www.google.ca"

  const email = "briyan@outlook.com"
  const handleClick = () => {
    if (email) {
      const mailtoURL = `mailto:${email}`;
      window.location = mailtoURL; // Open email client
    }
  };

  return (
    <group {...props} onPointerDown={handleClick}> 
      <Image color={color} map={icon} args={[fontSize, fontSize]} position={iconPosition} rotation={rotation} />
      <UnderlinedText font={font} fontSize={fontSize} color={color} position={textPosition} rotation={rotation} >
        {text}
      </UnderlinedText>
    </group>
  )
}

export default IconLink