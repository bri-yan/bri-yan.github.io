import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

import fullscreenVertex from './shaders/fullscreen.vert?raw'
import geometryVertex from './shaders/geometry.vert?raw'
import washFragment from './shaders/wash.frag?raw'
import lightingFragment from './shaders/lighting.frag?raw'
import geometryFragment from './shaders/geometry.frag?raw'
import edgesFragment from './shaders/edges.frag?raw'
import blurFragment from './shaders/blur.frag?raw'
import paperFragment from './shaders/paper.frag?raw'
import pigmentFragment from './shaders/pigment.frag?raw'
import bleedFragment from './shaders/bleed.frag?raw'
import bleedMaskFragment from './shaders/bleedMask.frag?raw'
import bleedCompositeFragment from './shaders/bleedComposite.frag?raw'
import surfaceFragment from './shaders/surface.frag?raw'
import displayFragment from './shaders/display.frag?raw'

const DEBUG_MODES = {
  final: 0,
  wash: 1,
  depth: 2,
  edges: 3,
  edgeSpread: 4,
  paper: 5,
  pigment: 6,
  bleeding: 7,
  surface: 8,
  controls: 9,
  diffuse: 10,
  specular: 11,
}

const CHANNELS = { rgb: 0, alpha: 1, 'rgb*a': 2, multiplied: 2, rgba: 2 }

function uniform(value) {
  return { value }
}

function makeTarget(width, height, nearest = false, depthBuffer = false) {
  const filter = nearest ? THREE.NearestFilter : THREE.LinearFilter
  const target = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    minFilter: filter,
    magFilter: filter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer,
    stencilBuffer: false,
  })
  target.texture.colorSpace = THREE.NoColorSpace
  target.texture.generateMipmaps = false
  return target
}

function makeMaterial(fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({
    vertexShader: fullscreenVertex,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
}

function createShape(name) {
  switch (name) {
    case 'torusKnot':
      return new THREE.TorusKnotGeometry(0.9, 0.28, 192, 32)
    case 'sphere':
      return new THREE.SphereGeometry(1.15, 96, 64)
    case 'box':
      return new THREE.BoxGeometry(1.65, 1.65, 1.65, 12, 12, 12)
    case 'cylinder':
      return new THREE.CylinderGeometry(0.85, 1.05, 2, 96, 16)
    case 'cone':
      return new THREE.ConeGeometry(1.1, 2.1, 96, 20)
    case 'torus':
    default:
      return new THREE.TorusGeometry(1, 0.42, 48, 144)
  }
}

export function createRenderer(canvas, initialSettings, onError) {
  const setupDisposers = []
  const registerSetupDisposer = (dispose) => setupDisposers.push(dispose)
  try {
    const engine = createRendererImpl(canvas, initialSettings, onError, registerSetupDisposer)
    setupDisposers.length = 0
    return engine
  } catch (error) {
    for (let index = setupDisposers.length - 1; index >= 0; index -= 1) {
      try { setupDisposers[index]() } catch { /* preserve the setup error */ }
    }
    throw error
  }
}

function createRendererImpl(canvas, initialSettings, onError, registerSetupDisposer) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false })
  registerSetupDisposer(() => renderer.dispose())
  renderer.toneMapping = THREE.NoToneMapping
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.autoClear = false

  let running = true
  let frameId = 0

  renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
    const programLog = gl.getProgramInfoLog(program)?.trim()
    const vertexLog = gl.getShaderInfoLog(vertexShader)?.trim()
    const fragmentLog = gl.getShaderInfoLog(fragmentShader)?.trim()
    running = false
    cancelAnimationFrame(frameId)
    onError?.(new Error([programLog, vertexLog, fragmentLog].filter(Boolean).join('\n')))
  }

  function handleContextLost(event) {
    event.preventDefault()
    running = false
    cancelAnimationFrame(frameId)
    onError?.(new Error('The WebGL rendering context was lost.'))
  }

  canvas.addEventListener('webglcontextlost', handleContextLost)
  registerSetupDisposer(() => canvas.removeEventListener('webglcontextlost', handleContextLost))

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  camera.position.set(0, 0.15, 5.5)

  const controls = new OrbitControls(camera, canvas)
  registerSetupDisposer(() => controls.dispose())
  controls.enableDamping = true
  controls.dampingFactor = 0.07
  controls.enablePan = false
  controls.minDistance = 3
  controls.maxDistance = 9

  const resolution = new THREE.Vector2(1, 1)
  const lightWorld = new THREE.Vector3(-3, 5, 5)
  const lightView = new THREE.Vector3()
  const pigmentColor = new THREE.Color()
  const paperColor = new THREE.Color()

  const washUniforms = {
    uPigment: uniform(pigmentColor),
    tLighting: uniform(null),
    uResolution: uniform(resolution),
    uShade: uniform(0),
    uHighlight: uniform(0),
    uVariation: uniform(0),
  }
  const geometryUniforms = {
    uFar: uniform(camera.far),
    uControlVariation: uniform(0),
  }
  const lightingUniforms = {
    uLightPosition: uniform(lightView),
    uAmbientStrength: uniform(0.2),
    uDiffuseStrength: uniform(0.7),
    uSpecularStrength: uniform(0.7),
    uShininess: uniform(32),
    uSpecularThreshold: uniform(0.3),
    uSpecularSoftness: uniform(0.08),
  }
  const edgesUniforms = {
    tWash: uniform(null),
    tGeometry: uniform(null),
    uResolution: uniform(resolution),
    uFar: uniform(camera.far),
    uDepthSensitivity: uniform(0),
    uColorSensitivity: uniform(0),
  }
  const blurUniforms = {
    tInput: uniform(null),
    uResolution: uniform(resolution),
    uPixelRatio: uniform(1),
    uDirection: uniform(new THREE.Vector2()),
    uRadius: uniform(0),
  }
  const paperUniforms = {
    uResolution: uniform(resolution),
    uPixelRatio: uniform(1),
    uPaperScale: uniform(1),
  }
  const pigmentUniforms = {
    tWash: uniform(null),
    tEdges: uniform(null),
    tPaper: uniform(null),
    tGeometry: uniform(null),
    uEdgeStrength: uniform(0),
    uPigmentDensity: uniform(0),
    uGranulation: uniform(0),
    uDryBrush: uniform(0),
    uBleedStrength: uniform(0),
  }
  const bleedUniforms = {
    tInput: uniform(null),
    tGeometry: uniform(null),
    tWash: uniform(null),
    tControl: uniform(null),
    uResolution: uniform(resolution),
    uPixelRatio: uniform(1),
    uFar: uniform(camera.far),
    uDirection: uniform(new THREE.Vector2()),
    uBleedRadius: uniform(0),
    uBleedStrength: uniform(0),
    uDepthThreshold: uniform(0),
    uFirstPass: uniform(1),
  }
  const bleedMaskUniforms = {
    tControl: uniform(null),
    tGeometry: uniform(null),
    tWash: uniform(null),
    uResolution: uniform(resolution),
    uPixelRatio: uniform(1),
    uFar: uniform(camera.far),
    uDirection: uniform(new THREE.Vector2()),
    uBleedRadius: uniform(0),
    uDepthThreshold: uniform(0),
    uFirstPass: uniform(1),
  }
  const bleedCompositeUniforms = {
    tInput: uniform(null),
    tOriginal: uniform(null),
    tControl: uniform(null),
    uBleedStrength: uniform(0),
  }
  const surfaceUniforms = {
    tInput: uniform(null),
    tPaper: uniform(null),
    tGeometry: uniform(null),
    uResolution: uniform(resolution),
    uPixelRatio: uniform(1),
    uDistortion: uniform(0),
    uPaperRelief: uniform(0),
    uPaperColor: uniform(paperColor),
    uFar: uniform(camera.far),
  }
  const displayUniforms = {
    tInput: uniform(null),
    tWash: uniform(null),
    tGeometry: uniform(null),
    uNear: uniform(camera.near),
    uFar: uniform(camera.far),
    uDebugMode: uniform(0),
    uChannel: uniform(0),
  }

  const trackMaterial = (material) => {
    registerSetupDisposer(() => material.dispose())
    return material
  }
  const washMaterial = trackMaterial(new THREE.ShaderMaterial({
    vertexShader: geometryVertex,
    fragmentShader: washFragment,
    uniforms: washUniforms,
    transparent: false,
    depthTest: true,
    depthWrite: true,
    toneMapped: false,
  }))
  const metadataMaterial = trackMaterial(new THREE.ShaderMaterial({
    vertexShader: geometryVertex,
    fragmentShader: geometryFragment,
    uniforms: geometryUniforms,
    depthTest: true,
    depthWrite: true,
    toneMapped: false,
  }))
  const lightingMaterial = trackMaterial(new THREE.ShaderMaterial({
    vertexShader: geometryVertex,
    fragmentShader: lightingFragment,
    uniforms: lightingUniforms,
    depthTest: true,
    depthWrite: true,
    toneMapped: false,
  }))
  const edgeMaterial = trackMaterial(makeMaterial(edgesFragment, edgesUniforms))
  const blurMaterial = trackMaterial(makeMaterial(blurFragment, blurUniforms))
  const paperMaterial = trackMaterial(makeMaterial(paperFragment, paperUniforms))
  const pigmentMaterial = trackMaterial(makeMaterial(pigmentFragment, pigmentUniforms))
  const bleedMaterial = trackMaterial(makeMaterial(bleedFragment, bleedUniforms))
  const bleedMaskMaterial = trackMaterial(makeMaterial(bleedMaskFragment, bleedMaskUniforms))
  const bleedCompositeMaterial = trackMaterial(makeMaterial(bleedCompositeFragment, bleedCompositeUniforms))
  const surfaceMaterial = trackMaterial(makeMaterial(surfaceFragment, surfaceUniforms))
  const displayMaterial = trackMaterial(makeMaterial(displayFragment, displayUniforms))
  const materials = [washMaterial, metadataMaterial, lightingMaterial, edgeMaterial, blurMaterial,
    paperMaterial, pigmentMaterial, bleedMaterial, bleedMaskMaterial,
    bleedCompositeMaterial, surfaceMaterial, displayMaterial]

  const fullscreenScene = new THREE.Scene()
  const fullscreenCamera = new THREE.Camera()
  const fullscreenGeometry = new THREE.BufferGeometry()
  registerSetupDisposer(() => fullscreenGeometry.dispose())
  fullscreenGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -1, -1, 0, 3, -1, 0, -1, 3, 0,
  ], 3))
  fullscreenGeometry.setAttribute('uv', new THREE.Float32BufferAttribute([
    0, 0, 2, 0, 0, 2,
  ], 2))
  const fullscreenMesh = new THREE.Mesh(fullscreenGeometry, edgeMaterial)
  fullscreenMesh.frustumCulled = false
  fullscreenScene.add(fullscreenMesh)

  const trackTarget = (target) => {
    registerSetupDisposer(() => target.dispose())
    return target
  }
  const targets = {
    lighting: trackTarget(makeTarget(1, 1, true, true)),
    wash: trackTarget(makeTarget(1, 1, false, true)),
    geometry: trackTarget(makeTarget(1, 1, true, true)),
    edges: trackTarget(makeTarget(1, 1)),
    blurTemp: trackTarget(makeTarget(1, 1)),
    edgeSpread: trackTarget(makeTarget(1, 1)),
    paper: trackTarget(makeTarget(1, 1)),
    pigment: trackTarget(makeTarget(1, 1)),
    bleedTemp: trackTarget(makeTarget(1, 1)),
    bleedFinal: trackTarget(makeTarget(1, 1)),
    bleedMaskTemp: trackTarget(makeTarget(1, 1)),
    bleedMask: trackTarget(makeTarget(1, 1)),
    bleeding: trackTarget(makeTarget(1, 1)),
    surface: trackTarget(makeTarget(1, 1)),
  }

  const debugTextures = [targets.surface, targets.wash, targets.geometry,
    targets.edges, targets.edgeSpread, targets.paper, targets.pigment,
    targets.bleeding, targets.surface, targets.geometry, targets.lighting, targets.lighting]

  washUniforms.tLighting.value = targets.lighting.texture
  edgesUniforms.tWash.value = targets.wash.texture
  edgesUniforms.tGeometry.value = targets.geometry.texture
  pigmentUniforms.tWash.value = targets.wash.texture
  pigmentUniforms.tEdges.value = targets.edgeSpread.texture
  pigmentUniforms.tPaper.value = targets.paper.texture
  pigmentUniforms.tGeometry.value = targets.geometry.texture
  bleedUniforms.tGeometry.value = targets.geometry.texture
  bleedUniforms.tWash.value = targets.wash.texture
  bleedMaskUniforms.tGeometry.value = targets.geometry.texture
  bleedMaskUniforms.tWash.value = targets.wash.texture
  bleedCompositeUniforms.tOriginal.value = targets.pigment.texture
  bleedCompositeUniforms.tInput.value = targets.bleedFinal.texture
  bleedCompositeUniforms.tControl.value = targets.bleedMask.texture
  surfaceUniforms.tInput.value = targets.bleeding.texture
  surfaceUniforms.tPaper.value = targets.paper.texture
  surfaceUniforms.tGeometry.value = targets.geometry.texture
  displayUniforms.tWash.value = targets.wash.texture
  displayUniforms.tGeometry.value = targets.geometry.texture

  let settings = initialSettings
  let shapeName = null
  let shapeRoot = null
  registerSetupDisposer(() => shapeRoot?.traverse((object) => object.geometry?.dispose()))
  let lastTime = performance.now()
  let cssWidth = 1
  let cssHeight = 1
  let sourceDpr = 1
  let effectiveDpr = 1
  let disposed = false

  function rebuildShape(nextShape) {
    if (nextShape === shapeName) return
    if (shapeRoot) {
      scene.remove(shapeRoot)
      shapeRoot.traverse((object) => object.geometry?.dispose())
    }
    shapeRoot = new THREE.Group()
    if (nextShape === 'overlap') {
      const sphere = new THREE.Mesh(createShape('sphere'), washMaterial)
      sphere.scale.setScalar(0.72)
      sphere.position.set(-0.48, 0.16, 0.25)
      const torus = new THREE.Mesh(createShape('torus'), washMaterial)
      torus.scale.setScalar(0.78)
      torus.position.set(0.5, -0.14, -0.25)
      torus.rotation.set(0.45, 0.25, 0.1)
      shapeRoot.add(sphere, torus)
    } else {
      shapeRoot.add(new THREE.Mesh(createShape(nextShape), washMaterial))
    }
    scene.add(shapeRoot)
    shapeName = nextShape
  }

  function setLinearColor(color, value, fallback) {
    color.set(value || fallback)
  }

  function applySettings(next) {
    settings = next || settings || {}
    rebuildShape(settings.shape || 'torus')
    setLinearColor(pigmentColor, settings.pigment, '#315f78')
    setLinearColor(paperColor, settings.paperColor, '#f3ead7')
    washUniforms.uShade.value = settings.shade ?? 0.65
    washUniforms.uHighlight.value = settings.highlight ?? 0.3
    washUniforms.uVariation.value = settings.variation ?? 0.25
    lightWorld.set(settings.lightX ?? -3, settings.lightY ?? 5, settings.lightZ ?? 5)
    lightingUniforms.uAmbientStrength.value = settings.ambientStrength ?? 0.2
    lightingUniforms.uDiffuseStrength.value = settings.diffuseStrength ?? 0.7
    lightingUniforms.uSpecularStrength.value = settings.specularStrength ?? 0.7
    lightingUniforms.uShininess.value = settings.shininess ?? 32
    lightingUniforms.uSpecularThreshold.value = settings.specularThreshold ?? 0.3
    lightingUniforms.uSpecularSoftness.value = settings.specularSoftness ?? 0.08
    geometryUniforms.uControlVariation.value = settings.controlVariation ?? 0.25
    edgesUniforms.uDepthSensitivity.value = settings.depthSensitivity ?? 1
    edgesUniforms.uColorSensitivity.value = settings.colorSensitivity ?? 1
    blurUniforms.uRadius.value = settings.edgeWidth ?? 1.5
    paperUniforms.uPaperScale.value = settings.paperScale ?? 5
    pigmentUniforms.uEdgeStrength.value = settings.edgeStrength ?? 0.6
    pigmentUniforms.uPigmentDensity.value = settings.pigmentDensity ?? 0.75
    pigmentUniforms.uGranulation.value = settings.granulation ?? 0.4
    pigmentUniforms.uDryBrush.value = settings.dryBrush ?? 0.15
    pigmentUniforms.uBleedStrength.value = settings.bleedStrength ?? 0.3
    bleedUniforms.uBleedRadius.value = settings.bleedRadius ?? 2
    bleedUniforms.uBleedStrength.value = settings.bleedStrength ?? 0.3
    bleedUniforms.uDepthThreshold.value = settings.depthThreshold ?? 0.02
    bleedMaskUniforms.uBleedRadius.value = settings.bleedRadius ?? 2
    bleedMaskUniforms.uDepthThreshold.value = settings.depthThreshold ?? 0.02
    bleedCompositeUniforms.uBleedStrength.value = settings.bleedStrength ?? 0.3
    surfaceUniforms.uDistortion.value = settings.distortion ?? 0.25
    surfaceUniforms.uPaperRelief.value = settings.paperRelief ?? 0.35
    displayUniforms.uDebugMode.value = DEBUG_MODES[settings.debugView] ?? 0
    displayUniforms.uChannel.value = CHANNELS[settings.debugChannel] ?? 0
  }

  function resize(width, height, devicePixelRatio = 1) {
    cssWidth = Math.max(1, width)
    cssHeight = Math.max(1, height)
    sourceDpr = devicePixelRatio
    const renderScale = Math.max(0.1, settings?.renderScale ?? 1)
    effectiveDpr = Math.min(sourceDpr, 1.5) * renderScale
    renderer.setPixelRatio(effectiveDpr)
    renderer.setSize(cssWidth, cssHeight, false)
    const drawWidth = Math.max(1, Math.round(cssWidth * effectiveDpr))
    const drawHeight = Math.max(1, Math.round(cssHeight * effectiveDpr))
    resolution.set(drawWidth, drawHeight)
    for (const target of Object.values(targets)) target.setSize(drawWidth, drawHeight)
    for (const uniforms of [washUniforms, edgesUniforms, blurUniforms, paperUniforms,
      pigmentUniforms, bleedUniforms, bleedMaskUniforms, surfaceUniforms, displayUniforms]) {
      if (uniforms.uPixelRatio) uniforms.uPixelRatio.value = effectiveDpr
    }
    camera.aspect = cssWidth / cssHeight
    // Keep the initial object framed when the canvas becomes portrait-shaped.
    // Orbit zoom remains independent of this projection adjustment.
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(
      Math.tan(THREE.MathUtils.degToRad(35) / 2) / Math.min(1, camera.aspect),
    ))
    camera.updateProjectionMatrix()
  }

  function renderPass(material, target) {
    fullscreenMesh.material = material
    renderer.setRenderTarget(target)
    renderer.clear(true, false, false)
    renderer.render(fullscreenScene, fullscreenCamera)
  }

  function draw(time) {
    if (!running) return
    frameId = requestAnimationFrame(draw)
    try {
      const delta = Math.min((time - lastTime) / 1000, 0.1)
      lastTime = time
      controls.update(delta)
      if (settings.rotate && shapeRoot) shapeRoot.rotation.y += delta * 0.35

      camera.updateMatrixWorld()
      lightView.copy(lightWorld).applyMatrix4(camera.matrixWorldInverse)

      renderer.setRenderTarget(targets.lighting)
      renderer.setClearColor(0x000000, 0)
      renderer.clear(true, true, false)
      scene.overrideMaterial = lightingMaterial
      renderer.render(scene, camera)

      renderer.setRenderTarget(targets.wash)
      renderer.setClearColor(0x000000, 0)
      renderer.clear(true, true, false)
      scene.overrideMaterial = null
      renderer.render(scene, camera)

      renderer.setRenderTarget(targets.geometry)
      renderer.setClearColor(0x000000, 1)
      renderer.clear(true, true, false)
      scene.overrideMaterial = metadataMaterial
      renderer.render(scene, camera)
      scene.overrideMaterial = null

      renderPass(edgeMaterial, targets.edges)
      blurUniforms.tInput.value = targets.edges.texture
      blurUniforms.uDirection.value.set(1, 0)
      renderPass(blurMaterial, targets.blurTemp)
      blurUniforms.tInput.value = targets.blurTemp.texture
      blurUniforms.uDirection.value.set(0, 1)
      renderPass(blurMaterial, targets.edgeSpread)
      renderPass(paperMaterial, targets.paper)
      renderPass(pigmentMaterial, targets.pigment)
      bleedUniforms.tInput.value = targets.pigment.texture
      bleedUniforms.tControl.value = targets.geometry.texture
      bleedUniforms.uDirection.value.set(1, 0)
      bleedUniforms.uFirstPass.value = 1
      renderPass(bleedMaterial, targets.bleedTemp)

      bleedMaskUniforms.tControl.value = targets.geometry.texture
      bleedMaskUniforms.uDirection.value.set(1, 0)
      bleedMaskUniforms.uFirstPass.value = 1
      renderPass(bleedMaskMaterial, targets.bleedMaskTemp)

      bleedUniforms.tInput.value = targets.bleedTemp.texture
      bleedUniforms.tControl.value = targets.bleedMaskTemp.texture
      bleedUniforms.uDirection.value.set(0, 1)
      bleedUniforms.uFirstPass.value = 0
      renderPass(bleedMaterial, targets.bleedFinal)

      bleedMaskUniforms.tControl.value = targets.bleedMaskTemp.texture
      bleedMaskUniforms.uDirection.value.set(0, 1)
      bleedMaskUniforms.uFirstPass.value = 0
      renderPass(bleedMaskMaterial, targets.bleedMask)
      renderPass(bleedCompositeMaterial, targets.bleeding)
      renderPass(surfaceMaterial, targets.surface)

      displayUniforms.tInput.value = debugTextures[displayUniforms.uDebugMode.value].texture
      renderer.setRenderTarget(null)
      renderer.setClearColor(0x000000, 0)
      renderer.clear(true, true, false)
      fullscreenMesh.material = displayMaterial
      renderer.render(fullscreenScene, fullscreenCamera)
    } catch (error) {
      running = false
      cancelAnimationFrame(frameId)
      scene.overrideMaterial = null
      onError?.(error)
    }
  }

  function update(nextSettings) {
    const previousScale = settings?.renderScale
    applySettings(nextSettings)
    if (settings.renderScale !== previousScale) resize(cssWidth, cssHeight, sourceDpr)
  }

  applySettings(initialSettings)
  resize(canvas.clientWidth || 1, canvas.clientHeight || 1, window.devicePixelRatio || 1)
  frameId = requestAnimationFrame(draw)

  return {
    update,
    resize,
    dispose() {
      if (disposed) return
      disposed = true
      running = false
      cancelAnimationFrame(frameId)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      controls.dispose()
      if (shapeRoot) shapeRoot.traverse((object) => object.geometry?.dispose())
      fullscreenGeometry.dispose()
      for (const material of materials) material.dispose()
      for (const target of Object.values(targets)) target.dispose()
      renderer.dispose()
    },
  }
}
