import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useFBO, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import './App.css'

// ============================================================================
// GLSL SHADERS
// ============================================================================

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// 9-tap Gaussian blur (horizontal pass)
const horizontalBlurShader = `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  varying vec2 vUv;

  // Gaussian weights for 9-tap kernel (sigma ≈ 3.0)
  const float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

  void main() {
    vec2 texelSize = 1.0 / uResolution;
    vec3 result = texture2D(tDiffuse, vUv).rgb * weights[0];

    // Horizontal samples
    for(int i = 1; i < 5; i++) {
      float offset = float(i);
      result += texture2D(tDiffuse, vUv + vec2(texelSize.x * offset, 0.0)).rgb * weights[i];
      result += texture2D(tDiffuse, vUv - vec2(texelSize.x * offset, 0.0)).rgb * weights[i];
    }

    gl_FragColor = vec4(result, 1.0);
  }
`

// 9-tap Gaussian blur (vertical pass)
const verticalBlurShader = `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  varying vec2 vUv;

  // Gaussian weights for 9-tap kernel (sigma ≈ 3.0)
  const float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

  void main() {
    vec2 texelSize = 1.0 / uResolution;
    vec3 result = texture2D(tDiffuse, vUv).rgb * weights[0];

    // Vertical samples
    for(int i = 1; i < 5; i++) {
      float offset = float(i);
      result += texture2D(tDiffuse, vUv + vec2(0.0, texelSize.y * offset)).rgb * weights[i];
      result += texture2D(tDiffuse, vUv - vec2(0.0, texelSize.y * offset)).rgb * weights[i];
    }

    gl_FragColor = vec4(result, 1.0);
  }
`

// ============================================================================
// BLUR ORCHESTRATION COMPONENT
// ============================================================================

function BlurPass({ children }) {
  const { gl, scene, camera, size } = useThree()

  // Create FBOs for multi-pass rendering
  const offscreenTarget = useFBO(size.width, size.height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  })

  const horizontalTarget = useFBO(size.width, size.height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  })

  // Scene and camera for full-screen quad passes
  const quadScene = useMemo(() => new THREE.Scene(), [])
  const quadCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), [])

  // Horizontal blur material
  const horizontalMaterial = useMemo(() =>
    new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: horizontalBlurShader,
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(size.width, size.height) },
      },
    }),
    []
  )

  // Vertical blur material
  const verticalMaterial = useMemo(() =>
    new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: verticalBlurShader,
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(size.width, size.height) },
      },
    }),
    []
  )

  // Full-screen quad
  const quadMesh = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(2, 2)
    const mesh = new THREE.Mesh(geometry, horizontalMaterial)
    quadScene.add(mesh)
    return mesh
  }, [quadScene, horizontalMaterial])

  // Update resolution uniforms when size changes
  useFrame(() => {
    horizontalMaterial.uniforms.uResolution.value.set(size.width, size.height)
    verticalMaterial.uniforms.uResolution.value.set(size.width, size.height)
  }, -1) // Run before other useFrame hooks

  useFrame(() => {
    // PASS 1: Render main scene to offscreenTarget
    gl.setRenderTarget(offscreenTarget)
    gl.clear()
    gl.render(scene, camera)

    // PASS 2: Horizontal blur (offscreenTarget → horizontalTarget)
    quadMesh.material = horizontalMaterial
    horizontalMaterial.uniforms.tDiffuse.value = offscreenTarget.texture
    gl.setRenderTarget(horizontalTarget)
    gl.clear()
    gl.render(quadScene, quadCamera)

    // PASS 3: Vertical blur (horizontalTarget → screen)
    quadMesh.material = verticalMaterial
    verticalMaterial.uniforms.tDiffuse.value = horizontalTarget.texture
    gl.setRenderTarget(null) // Render to screen
    gl.clear()
    gl.render(quadScene, quadCamera)
  }, 1) // Run after other useFrame hooks

  return <>{children}</>
}

// ============================================================================
// SCENE WITH TORUS
// ============================================================================

function TorusScene() {
  const torusRef = useRef()

  useFrame((state) => {
    if (torusRef.current) {
      torusRef.current.rotation.x = state.clock.elapsedTime * 0.3
      torusRef.current.rotation.y = state.clock.elapsedTime * 0.5
    }
  })

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#ff00ff" />

      {/* Torus */}
      <mesh ref={torusRef}>
        <torusGeometry args={[1, 0.4, 32, 100]} />
        <meshStandardMaterial
          color="#00ffff"
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>

      {/* Additional meshes for visual interest */}
      <mesh position={[-2.5, 0, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#ff6b6b" />
      </mesh>

      <mesh position={[2.5, 0, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color="#4ecdc4" />
      </mesh>
    </>
  )
}

// ============================================================================
// MAIN APP
// ============================================================================

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#f2f2f2"]} />
        <BlurPass>
          <TorusScene />
          <OrbitControls enableDamping dampingFactor={0.05} />
        </BlurPass>
      </Canvas>

      {/* UI Overlay */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '14px',
        background: 'rgba(0,0,0,0.5)',
        padding: '10px',
        borderRadius: '5px',
        pointerEvents: 'none'
      }}>
        <div>🎨 Multi-Pass Gaussian Blur</div>
        <div>9-tap Separable Kernel</div>
        <div>Pass 1: Scene → Offscreen FBO</div>
        <div>Pass 2: Horizontal Blur → FBO</div>
        <div>Pass 3: Vertical Blur → Screen</div>
      </div>
    </div>
  )
}

export default App
