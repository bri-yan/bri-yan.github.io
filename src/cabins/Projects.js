import { Text, Text3D, useTexture } from '@react-three/drei'
import Seats from '../components/Seats'
import Image from '../components/Image'
import ProjectEntry from '../components/ProjectEntry'
import IconLink from '../components/IconLink'

const Blurb = ({...props}) => {
  // Content
  const header = "Projects"
  const project1 = {
    title: "Fairify | StormHacks 2021 Winner",
    link: "github.com/bri-yan/StormHacks",
    url: "https://github.com/bri-yan/StormHacks"
  }
  const project2 = {
    title: "Jesture | nwHacks 2022 Finalist",
    link: "github.com/StuffByAndrew/ASL-Learner-NWHacks",
    url: "https://github.com/StuffByAndrew/ASL-Learner-NWHacks"
  }
  const project3 = {
    title: "Sentri | Pinnacle Hackathon 2021 Finalist",
    link: "github.com/bri-yan/StormHacks",
    url: "https://devpost.com/software/sentri"
  }
  const project4 = {
    title: "Placeholder",  
    link: "github.com/bri-yan/placeholder",
    url: "https://github.com/bri-yan/placeholder"
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
      <Image map={img} args={[1.6, 1.6]} position={[12, 1.92, -7.75]} rotation={[-Math.PI / 2, 0, 0]} />

      {/* Projects */}
      <ProjectEntry title={project1.title} link={project1.link} url={project1.url}
      position={[3.25, 1.92, projectStart]} rotation={[-Math.PI / 2, 0, 0]} />

      <ProjectEntry title={project2.title} link={project2.link} url={project2.url}
      position={[3.25, 1.92, projectStart + projectSpacing]} rotation={[-Math.PI / 2, 0, 0]} />

      <ProjectEntry title={project3.title} link={project3.link} url={project3.url}
      position={[3.25, 1.92, projectStart + projectSpacing * 2]} rotation={[-Math.PI / 2, 0, 0]} />

      <ProjectEntry title={project4.title} link={project4.link} url={project4.url}
      position={[3.25, 1.92, projectStart + projectSpacing * 3]} rotation={[-Math.PI / 2, 0, 0]} />

    </group>
  )
}


const Projects = ({ models, color = 'white', seatColor = 'white', header, body, texture, ...props }) => (
  <group {...props}>
    <models.Cabin color={color} />
    <Seats models={models} seatColor={seatColor} />
    <Blurb />
  </group>
)

export default Projects
