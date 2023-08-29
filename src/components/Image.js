const Image = ({ map, args, position, rotation, ...props }) => (
  <mesh position={position} rotation={rotation}>
    <planeBufferGeometry args={args} /> {/* image size */}
    <meshStandardMaterial map={map} transparent/>
  </mesh>
)

export default Image