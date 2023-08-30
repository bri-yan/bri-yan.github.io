import { Text, useTexture } from '@react-three/drei'
const EducationEntry = ({ institute, degree, duration, position, rotation, ...props }) => {  
    // Images
    const img = useTexture("./images/popcat-open.png")

    // Positions
    const titlePosition = position
    const organizationPosition = [position[0], position[1], position[2] + .9]
    const durationPosition = [position[0], position[1], position[2] + 1.8]
  
    return (
      <group {...props}>
  
        {/* Institute Name */}
        <Text font="./fonts/Lato-Regular.ttf" fontSize={0.75} color="#ffffff" position={titlePosition} rotation={rotation} maxWidth={15} anchorX='left' anchorY='top' >
          {institute}
        </Text>

        {/* Degree/Certification */}
        <Text font="./fonts/Lato-Regular.ttf" fontSize={0.75} color="#ffffff" position={organizationPosition} rotation={rotation} maxWidth={17} anchorX='left' anchorY='top' >
          {degree}
        </Text>
        
        {/* Duration */}
        <Text font="./fonts/Lato-Italic.ttf" fontSize={0.6} color="#ffffff" position={durationPosition} rotation={rotation} maxWidth={15} anchorX='left' anchorY='top' >
          {duration}
        </Text>
  
      </group>
    )
  }
  
  export default EducationEntry