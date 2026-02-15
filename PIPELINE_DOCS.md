# Multi-Pass Rendering Pipeline Documentation

## Architecture Overview

This multi-pass pipeline renders the scene through three distinct stages:

```
Scene → BlinnPhongPass → FBO₁ ─┐
     → BlurPass       → FBO₂ ─┤
                                ├→ CompositorPass → Screen
                                ─┘
```

### Rendering Flow

1. **BlinnPhongPass** - Renders scene geometry with Blinn-Phong lighting model to FBO₁
2. **BlurPass** - Renders scene with two-pass Gaussian blur to FBO₂
3. **CompositorPass** - Combines FBO₁ and FBO₂ using blend modes and weights

---

## Shader Specifications

### 1. Blinn-Phong Shaders (`blinnPhongShaders.js`)

**Vertex Shader:**
- Transforms vertex positions and normals to view space
- Outputs: `vNormal`, `vViewPosition`, `vUv`

**Fragment Shader:**
- Implements classic Blinn-Phong illumination model
- **Components:**
  - **Ambient**: `I_a = k_a * L_a`
  - **Diffuse**: `I_d = k_d * (N · L) * L_c`
  - **Specular**: `I_s = k_s * (N · H)^α * L_c`

  Where:
  - `N` = surface normal
  - `L` = light direction
  - `H` = halfway vector between view and light
  - `α` = shininess exponent

**Uniforms:**
```glsl
uniform vec3 uLightPosition;      // Light position in view space
uniform vec3 uLightColor;         // Light color
uniform vec3 uAmbientColor;       // Ambient light color
uniform vec3 uDiffuseColor;       // Material diffuse color
uniform vec3 uSpecularColor;      // Material specular color
uniform float uShininess;         // Specular exponent (typically 32)
uniform float uAmbientStrength;   // Ambient coefficient (0.3)
uniform float uDiffuseStrength;   // Diffuse coefficient (0.7)
uniform float uSpecularStrength;  // Specular coefficient (0.5)
```

---

### 2. Blur Shaders (`blurShaders.js`)

**Separable 9-tap Gaussian Blur (σ ≈ 3.0)**

**Horizontal Pass:**
```glsl
// Weights for 9-tap kernel
const float weights[5] = float[](
  0.227027,   // center
  0.1945946,  // ±1 pixel
  0.1216216,  // ±2 pixels
  0.054054,   // ±3 pixels
  0.016216    // ±4 pixels
);

result = tex(center) * w[0] +
         tex(±1x) * w[1] +
         tex(±2x) * w[2] +
         tex(±3x) * w[3] +
         tex(±4x) * w[4];
```

**Vertical Pass:**
- Same weights, applied along Y-axis
- Two-pass approach reduces complexity from O(n²) to O(2n)

**Uniforms:**
```glsl
uniform sampler2D tDiffuse;   // Input texture
uniform vec2 uResolution;     // Screen resolution
```

---

### 3. Compositor Shader (`compositorShaders.js`)

**Blend Modes:**

1. **Additive** (`uBlendMode = 0`):
   ```glsl
   result = a + b
   ```

2. **Multiply** (`uBlendMode = 1`):
   ```glsl
   result = a * b
   ```

3. **Screen** (`uBlendMode = 2`):
   ```glsl
   result = 1 - (1 - a) * (1 - b)
   ```

**Uniforms:**
```glsl
uniform sampler2D tBlinnPhong;     // Blinn-Phong FBO output
uniform sampler2D tBlur;           // Blur FBO output
uniform float uBlinnPhongWeight;   // Weight for Blinn-Phong (0-1)
uniform float uBlurWeight;         // Weight for blur (0-1)
uniform float uBlendMode;          // Blend mode selector
```

**Fragment Shader Logic:**
```glsl
vec3 blinnPhong = texture2D(tBlinnPhong, vUv).rgb * uBlinnPhongWeight;
vec3 blur = texture2D(tBlur, vUv).rgb * uBlurWeight;
vec3 result = blend(blinnPhong, blur, uBlendMode);
```

---

## React Component Structure

### BlinnPhongPass.jsx
```jsx
<BlinnPhongPass outputRef={ref}>
  {children}
</BlinnPhongPass>
```

**Purpose**: Renders scene with Blinn-Phong lighting to FBO

**Props:**
- `children` - Scene content
- `outputRef` - React ref to store FBO target

**Implementation Details:**
- Clones the main scene
- Replaces all materials with Blinn-Phong shader materials
- Caches materials per mesh UUID for performance
- Renders to dedicated FBO
- Stores FBO reference in `outputRef.current`

---

### BlurPass.jsx
```jsx
<BlurPass outputRef={ref}>
  {children}
</BlurPass>
```

**Purpose**: Applies two-pass Gaussian blur to scene

**Props:**
- `children` - Scene content
- `outputRef` - React ref to store FBO target (optional)

**Render Stages:**
1. Render scene → `offscreenTarget`
2. Horizontal blur → `horizontalTarget`
3. Vertical blur → `verticalTarget` (stored in outputRef)

**FBO Chain:**
```
Scene → offscreenTarget → [H-Blur] → horizontalTarget → [V-Blur] → verticalTarget
```

---

### CompositorPass.jsx
```jsx
<CompositorPass
  blinnPhongRef={blinnPhongRef}
  blurRef={blurRef}
  blinnPhongWeight={0.6}
  blurWeight={0.4}
  blendMode={0}
/>
```

**Purpose**: Combines multiple FBO outputs into final image

**Props:**
- `blinnPhongRef` - Ref to Blinn-Phong FBO
- `blurRef` - Ref to Blur FBO
- `blinnPhongWeight` - Weight for Blinn-Phong contribution (default: 0.6)
- `blurWeight` - Weight for blur contribution (default: 0.4)
- `blendMode` - Blend operation (0=add, 1=multiply, 2=screen)

**Rendering:**
- Uses fullscreen quad with orthographic camera
- Samples both input FBOs
- Applies weighted blending
- Renders directly to screen (null render target)
- Executes last (priority 2) via `useFrame(..., 2)`

---

### MultiPassPipeline.jsx
```jsx
<MultiPassPipeline
  blinnPhongWeight={0.6}
  blurWeight={0.4}
  blendMode={0}
>
  {children}
</MultiPassPipeline>
```

**Purpose**: Orchestrates entire multi-pass pipeline

**Component Tree:**
```jsx
<BlinnPhongPass outputRef={blinnPhongOutputRef}>
  <BlurPass outputRef={blurOutputRef}>
    {children}
  </BlurPass>
</BlinnPhongPass>

<CompositorPass
  blinnPhongRef={blinnPhongOutputRef}
  blurRef={blurOutputRef}
  {...weights}
/>
```

---

## Usage Example

```jsx
import { MultiPassPipeline } from './components/MultiPassPipeline';

function App() {
  return (
    <Canvas>
      <MultiPassPipeline
        blinnPhongWeight={0.6}  // 60% Blinn-Phong
        blurWeight={0.4}        // 40% Blur
        blendMode={0}           // Additive blending
      >
        <TorusScene />
        <OrbitControls />
      </MultiPassPipeline>
    </Canvas>
  );
}
```

---

## Performance Considerations

### FBO Usage
- **Total FBOs**: 5
  - 1 for Blinn-Phong output
  - 3 for blur passes (offscreen, horizontal, vertical)
  - All use LINEAR filtering and RGBA format

### Render Order (via useFrame priority)
```
Priority -1: Update uniforms (resolution, weights)
Priority  1: BlinnPhongPass & BlurPass rendering
Priority  2: CompositorPass final composite
```

### Optimization Tips
1. **Material Caching**: Blinn-Phong materials are cached per mesh UUID
2. **Separable Blur**: Two 1D passes instead of 2D (9 samples vs 81)
3. **Conditional Rendering**: Compositor only renders when both FBOs are ready

---

## Extension Points

This architecture is designed for easy extension:

1. **Add New Passes**: Create new pass components following the pattern:
   ```jsx
   export function CustomPass({ children, outputRef }) {
     const target = useFBO(...);
     if (outputRef) outputRef.current = target;
     // Render logic
     return <>{children}</>;
   }
   ```

2. **Modify Compositor**: Add new blend modes in `compositorFragmentShader`

3. **Chain Multiple Effects**: Nest passes within MultiPassPipeline

Example:
```jsx
<BlinnPhongPass outputRef={ref1}>
  <BlurPass outputRef={ref2}>
    <EdgeDetectPass outputRef={ref3}>
      {children}
    </EdgeDetectPass>
  </BlurPass>
</BlinnPhongPass>
<CompositorPass inputs={[ref1, ref2, ref3]} />
```

---

## Technical Notes

- **No MRTs**: Uses single-target FBOs for better compatibility
- **View Space Lighting**: Blinn-Phong calculations in view space for stability
- **Fullscreen Quads**: All post-processing uses normalized device coordinates (-1 to 1)
- **Texture Sampling**: LINEAR filtering on all FBOs for smooth results
