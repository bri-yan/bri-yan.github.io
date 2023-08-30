import { Text, Text3D, useTexture } from '@react-three/drei'
import Seats from '../components/Seats'
import Image from '../components/Image'
import IconLink from '../components/IconLink'
import UnderlinedText from '../components/UnderlinedText'





const Blurb = ({...props}) => {
  // Content
  const header = "About Me"
  const body = "\
Hi, my name is Brian and I am an Engineering Physics student at the University of British Columbia with a passion for robotics and machine learning.\
  \n\n\
In my free time I like to hike, snowboard, read, and build robots.\
  \n\n\
  "
  
  // Images
  const popcat = useTexture("./images/popcat-open.png")
  
  // Icons
  const resumeIcon = useTexture("./icons/resume-white.png")
  const emailIcon = useTexture("./icons/envelope-white.png")
  const linkedinIcon = useTexture("./icons/linkedin-white.png")
  const githubIcon = useTexture("./icons/github-white.png")

  // Links
  const resume = "resume"
  const email = "bri.yan@outlook.com"
  const linkedin = "linkedin.com/in/brian-yan"
  const github = "github.com/bri-yan"

  // URLs
  const resumeURL = `https://docs.google.com/gview?url=https://raw.githubusercontent.com/bri-yan/bri-yan.github.io/main/public/Brian_Yan_Resume.pdf`
  const emailURL = `mailto:${email}`
  const linkedinURL = `https://www.${linkedin}`
  const githubURL = `https://www.${github}`
  
  // Details
  const linkStart = 1.6

  return (
    <group {...props}>
      
      {/* Header */}
      <Text3D font="./fonts/Lato_Regular.json" size={1.5} height={0.12} position={[3.25, 1.8, -7]} rotation={[-Math.PI / 2, 0, 0]}>
        {header}
      </Text3D>

      {/* Body */}
      <Text font="./fonts/Lato-Regular.ttf" fontSize={0.75} color="#ffffff" position={[3.15, 1.92, -5.75]} rotation={[-Math.PI / 2, 0, 0]} maxWidth={15} anchorX='left' anchorY='top' >
        {body}
      </Text>

      {/* Links */}

      <IconLink url={resumeURL} icon={resumeIcon} font="./fonts/Lato-Regular.ttf" fontSize={0.75} color="#ffffff" position={[3.15, 1.92, linkStart]} rotation={[-Math.PI / 2, 0, 0]}>
        {resume}
      </IconLink>

      <IconLink url={emailURL} icon={emailIcon} font="./fonts/Lato-Regular.ttf" fontSize={0.75} color="#ffffff" position={[3.15, 1.92, linkStart + 1]} rotation={[-Math.PI / 2, 0, 0]}>
        {email}
      </IconLink>

      <IconLink url={linkedinURL} icon={linkedinIcon} font="./fonts/Lato-Regular.ttf" fontSize={0.75} color="#ffffff" position={[3.15, 1.92, linkStart + 2]} rotation={[-Math.PI / 2, 0, 0]}>
        {linkedin}
      </IconLink>

      <IconLink url={githubURL} icon={githubIcon} font="./fonts/Lato-Regular.ttf" fontSize={0.75} color="#ffffff" position={[3.15, 1.92, linkStart + 3]} rotation={[-Math.PI / 2, 0, 0]}>
        {github}
      </IconLink>

      

      {/* Image 1 */}
      <Image map={popcat} args={[1.6, 1.6]} position={[13.5, 1.92, -7.75]} rotation={[-Math.PI / 2, 0, 0]} />

    </group>
  )
}

const About = ({ models, color = 'white', seatColor = 'white', header, body, texture, ...props }) => (
  <group {...props}>
    <models.Cabin color={color} />
    <Seats models={models} seatColor={seatColor} />
    <Blurb />
  </group>
)

export default About
