import { Text, Text3D, useTexture } from '@react-three/drei'
import Seats from '../components/Seats'
import Image from '../components/Image'
import ExperienceEntry from '../components/ExperienceEntry'
import IconLink from '../components/IconLink'

const Blurb = ({...props}) => {
  // Content
  const header = "Experience"
  const experience1 = {
    title: "Software Engineer Intern",
    organization: "Collective[i]",
    duration: "May 2023 - Aug 2023 · 4 months",
    location: "New York, New York, United States"
  }
  const experience2 = {
    title: "Software Engineer Intern",
    organization: "DaoAI Robotics Inc.",
    duration: "May 2022 - Aug 2022 · 4 months",
    location: "Vancouver, British Columbia, Canada"
  }
  const experience3 = {
    title: "Software Engineer Intern",
    organization: "Delta Controls Inc.",
    duration: "Jan 2021 - May 2021 · 5 months",
    location: "Vancouver, British Columbia, Canada"
  }
  const experience4 = {
    title: "Machine Vision Developer",
    organization: "UBC Open Robotics",
    duration: "Sep 2021 - Present",
    location: "Vancouver, British Columbia, Canada"
  }

  // Resume
  const resume = "resume"
  const resumeURL = `https://docs.google.com/gview?url=https://raw.githubusercontent.com/bri-yan/bri-yan.github.io/main/public/Brian_Yan_Resume.pdf`
  const resumeIcon = useTexture("./icons/resume-white.png")

  // Images
  const img = useTexture("./images/popcat-open.png")

  // Details
  const resumeLinkStart = -6.15
  const experienceStart = -4.75
  const experienceSpacing = 3.5

  return (
    <group {...props}>
      
      {/* Header */}
      <Text3D font="./fonts/Lato_Regular.json" size={1.5} height={0.12} position={[3.25, 1.8, -7]} rotation={[-Math.PI / 2, 0, 0]}>
        {header}
      </Text3D>

      {/* Header Icon */}
      <Image map={img} args={[1.6, 1.6]} position={[14.6, 1.92, -7.75]} rotation={[-Math.PI / 2, 0, 0]} />

      {/* Resume */}
      <IconLink url={resumeURL} icon={resumeIcon} font="./fonts/Lato-Regular.ttf" fontSize={0.75} color="#ffffff" position={[3.25, 1.92, resumeLinkStart]} rotation={[-Math.PI / 2, 0, 0]}>
        {resume}
      </IconLink>

      {/* Experiences */}
      <ExperienceEntry title={experience1.title} organization={experience1.organization} duration={experience1.duration} location={experience1.location}
      position={[3.25, 1.92, experienceStart]} rotation={[-Math.PI / 2, 0, 0]} />

      <ExperienceEntry title={experience2.title} organization={experience2.organization} duration={experience2.duration} location={experience2.location}
      position={[3.25, 1.92, experienceStart + experienceSpacing]} rotation={[-Math.PI / 2, 0, 0]} />

      <ExperienceEntry title={experience3.title} organization={experience3.organization} duration={experience3.duration} location={experience3.location}
      position={[3.25, 1.92, experienceStart + experienceSpacing * 2]} rotation={[-Math.PI / 2, 0, 0]} />

      <ExperienceEntry title={experience4.title} organization={experience4.organization} duration={experience4.duration} location={experience4.location}
      position={[3.25, 1.92, experienceStart + experienceSpacing * 3]} rotation={[-Math.PI / 2, 0, 0]} />

    </group>
  )
}


const Experience = ({ models, color = 'white', seatColor = 'white', header, body, texture, ...props }) => (
  <group {...props}>
    <models.Cabin color={color} />
    <Seats models={models} seatColor={seatColor} />
    <Blurb />
  </group>
)

export default Experience
