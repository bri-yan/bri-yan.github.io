import { Text, useTexture } from '@react-three/drei'
import Link from './Link'

const ProjectEntry = ({ title, link, url, position, rotation, ...props }) => {  
    // Images
    const img = useTexture("./images/popcat-open.png")

    // Positions
    const titlePosition = position
    const linkPosition = [position[0], position[1], position[2] + .85]
  
    return (
      <group {...props}>
  
        {/* Experience Title */}
        <Text font="./fonts/Lato-Regular.ttf" fontSize={0.75} color="#ffffff" position={titlePosition} rotation={rotation} maxWidth={15} anchorX='left' anchorY='top' >
          {title}
        </Text>

        <Link url={url} font="./fonts/Lato-Italic.ttf" fontSize={0.6} color="#ffffff" position={linkPosition} rotation={[-Math.PI / 2, 0, 0]}>
            {link}
        </Link>
  
      </group>
    )
  }
  
  export default ProjectEntry