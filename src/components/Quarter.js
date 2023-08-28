const Quarter = ({ models, color, ...props }) => (
    <group {...props}>
      <models.Seat color={color} position={[-0.35, 0, 0.7]} />
      <models.Seat color={color} position={[0.35, 0, 0.7]} />
      <models.Seat color={color} position={[-0.35, 0, -0.7]} rotation={[0, Math.PI, 0]} />
      <models.Seat color={color} position={[0.35, 0, -0.7]} rotation={[0, Math.PI, 0]} />
    </group>
  )

export default Quarter