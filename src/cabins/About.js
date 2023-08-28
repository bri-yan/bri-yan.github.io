import { Text, Text3D, useTexture } from '@react-three/drei'
import Seats from '../components/Seats'

const intro = "\
Hi, my name is Brian and I am an Engineering Physics student at the University of British Columbia with a passion for robotics and machine learning.\
\n\n\
In my free time I like to hike, snowboard, read, and build robots.\
\n\n\
Links:\
\nEmail\
\nResume\
\nLinkedIn\
\nGithub"

const Blurb = ({...props}) => {
  // Images
  const popcat = useTexture("./images/popcat.png")

  return (
    <group {...props}>
      
      {/* Header */}
      <Text3D font="./fonts/Lato_Regular.json" size={1.5} height={0.12} position={[3.25, 1.8, -7]} rotation={[-Math.PI / 2, 0, 0]}>
        {"About Me"}
      </Text3D>

      {/* Body */}
      <Text font="./fonts/Lato-Regular.ttf" fontSize={0.75} color="#ffffff" position={[3.15, 1.92, -5.75]} rotation={[-Math.PI / 2, 0, 0]} maxWidth={15} anchorX='left' anchorY='top' >
        {intro}
      </Text>

      {/* Image 1 */}
      <mesh position={[13.5, 1.92, -7.75]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeBufferGeometry args={[1.6, 1.6]} /> {/* image size */}
        <meshStandardMaterial map={popcat} transparent />
      </mesh>

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
