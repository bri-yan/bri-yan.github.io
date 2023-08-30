import { Text3D, useTexture } from '@react-three/drei'
import Seats from '../components/Seats'
import Image from '../components/Image'
import EducationEntry from '../components/EducationEntry'

const Blurb = ({...props}) => {
  // Content
  const header = "Education"
  const project1 = {
    institute: "The University of British Columbia",
    degree: "Bachelor of Applied Science - Engineering Physics",
    duration: "Expected Graduation: May 2025"
  }
  const project2 = {
    institute: "National University of Singapore",
    degree: "Exchange Program",
    duration: "Jan 2023 - Apr 2023"
  }

  // Images
  const img = useTexture("./images/popcat-open.png")

  // Details
  const projectStart = -5.75
  const projectSpacing = 3.5

  return (
    <group {...props}>
      
      {/* Header */}
      <Text3D font="./fonts/Lato_Regular.json" size={1.5} height={0.12} position={[3.25, 1.8, -7]} rotation={[-Math.PI / 2, 0, 0]}>
        {header}
      </Text3D>

      {/* Header Icon */}
      <Image map={img} args={[1.6, 1.6]} position={[13.75, 1.92, -7.75]} rotation={[-Math.PI / 2, 0, 0]} />

      {/* Projects */}
      <EducationEntry institute={project1.institute} degree={project1.degree} duration={project1.duration}
      position={[3.25, 1.92, projectStart]} rotation={[-Math.PI / 2, 0, 0]} />

      <EducationEntry institute={project2.institute} degree={project2.degree} duration={project2.duration}
      position={[3.25, 1.92, projectStart + projectSpacing]} rotation={[-Math.PI / 2, 0, 0]} />

    </group>
  )
}


const Education = ({ models, color = 'white', seatColor = 'white', header, body, texture, ...props }) => (
  <group {...props}>
    <models.Cabin color={color} />
    <Seats models={models} seatColor={seatColor} />
    <Blurb />
  </group>
)

export default Education
