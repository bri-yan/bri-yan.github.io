import { Text, Text3D, useTexture } from '@react-three/drei'
import Seats from '../components/Seats'
import Image from '../components/Image'
import IconLink from '../components/IconLink'
import UnderlinedText from '../components/UnderlinedText'

const header = "About Me"

const intro = "\
Hi, my name is Brian and I am an Engineering Physics student at the University of British Columbia with a passion for robotics and machine learning.\
\n\n\
In my free time I like to hike, snowboard, read, and build robots.\
\n\n\
"



const Blurb = ({...props}) => {
  // Images
  const popcat = useTexture("./images/popcat.png")
  
  // Icons
  const emailIcon = useTexture("./icons/envelope-white.png")
  const linkedinIcon = useTexture("./icons/linkedin-white.png")
  const githubIcon = useTexture("./icons/github-white.png")

  // Links
  const email = "bri.yan@outlook.com"
  const linkedin = "linkedin.com/in/brian-yan"
  const github = "github.com/bri-yan"

  const start = 3.6

  return (
    <group {...props}>
      
      {/* Header */}
      <Text3D font="./fonts/Lato_Regular.json" size={1.5} height={0.12} position={[3.25, 1.8, -7]} rotation={[-Math.PI / 2, 0, 0]}>
        {header}
      </Text3D>

      {/* Body */}
      <Text font="./fonts/Lato-Regular.ttf" fontSize={0.75} color="#ffffff" position={[3.15, 1.92, -5.75]} rotation={[-Math.PI / 2, 0, 0]} maxWidth={15} anchorX='left' anchorY='top' >
        {intro}
      </Text>

      {/* Link 1 */}
      <IconLink icon={emailIcon} font="./fonts/Lato-Regular.ttf" fontSize={0.75} color="#ffffff" position={[3.15, 1.92, 1.6]} rotation={[-Math.PI / 2, 0, 0]}>
        {email}
      </IconLink>

      <IconLink icon={linkedinIcon} font="./fonts/Lato-Regular.ttf" fontSize={0.75} color="#ffffff" position={[3.15, 1.92, 2.6]} rotation={[-Math.PI / 2, 0, 0]}>
        {linkedin}
      </IconLink>

      <IconLink icon={githubIcon} font="./fonts/Lato-Regular.ttf" fontSize={0.75} color="#ffffff" position={[3.15, 1.92, 3.6]} rotation={[-Math.PI / 2, 0, 0]}>
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
    <Blurb header={header} body={body} texture={texture} />
  </group>
)

export default About
