import { Text, useTexture } from '@react-three/drei'
const ExperienceEntry = ({ title, organization, duration, location, position, rotation, ...props }) => {  
   // Positions
    const titlePosition = position
    const organizationPosition = [position[0], position[1], position[2] + .9]
    const durationPosition = [position[0], position[1], position[2] + 1.65]
    const locationPosition = [position[0], position[1], position[2] + 2.4]
  
    return (
      <group {...props}>
  
        {/* Experience Title */}
        <Text font="./fonts/Lato-Regular.ttf" fontSize={0.75} color="#ffffff" position={titlePosition} rotation={rotation} maxWidth={15} anchorX='left' anchorY='top' >
          {title}
        </Text>

        {/* Organization */}
        <Text font="./fonts/Lato-Italic.ttf" fontSize={0.6} color="#aaaaaa" position={organizationPosition} rotation={rotation} maxWidth={15} anchorX='left' anchorY='top' >
          {organization}
        </Text>
        
        {/* Duration */}
        <Text font="./fonts/Lato-Italic.ttf" fontSize={0.6} color="#aaaaaa" position={durationPosition} rotation={rotation} maxWidth={15} anchorX='left' anchorY='top' >
          {duration}
        </Text>

        {/* Location */}
        <Text font="./fonts/Lato-Italic.ttf" fontSize={0.6} color="#aaaaaa" position={locationPosition} rotation={rotation} maxWidth={15} anchorX='left' anchorY='top' >
          {location}
        </Text>
  
      </group>
    )
  }
  
  export default ExperienceEntry