import { useEffect, useRef } from "react"
import * as THREE from "three"

// =============================================================================
// Theme — central palette & behavior toggles for light / dark meadow
// =============================================================================

export type MeadowThemeMode = "light" | "dark"

const THEME = {
  light: {
    skyTop: new THREE.Color("#f4d9d4"),
    skyMid: new THREE.Color("#e8d8f2"),
    skyHorizon: new THREE.Color("#cfe8f0"),
    skyBottom: new THREE.Color("#d4efe8"),
    haze: new THREE.Color("#fff5f0"),
    /** Softer density + horizon-tinted fog so distance reads atmospheric, not muddy gray */
    fogNear: 0.048,
    fogColor: new THREE.Color("#d2e8ee"),
    /** Sky haze anchor (horizon glow); disk uses sunCore / sunRim */
    sun: new THREE.Color("#ffd8b0"),
    sunCore: new THREE.Color("#fffbf5"),
    sunRim: new THREE.Color("#ffd4a8"),
    /** Back → front: airy cool peaks stepping into sage-teal foothills */
    mountainColors: [
      "#c4d2f0",
      "#a8b9e6",
      "#8aa5d4",
      "#6d9aab",
      /* Nearest bands: more chroma so they read as foothills, not mud-gray */
      "#3f9d7e",
      "#2d8a6a",
    ] as const,
    treesBack: new THREE.Color("#3d5c4a"),
    treesMid: new THREE.Color("#2d4a38"),
    /** Sunlit sage — reads as grass, not gray-mauve; pairs with teal foothills + dark tree line */
    meadow: new THREE.Color("#5a7268"),
    meadowBright: new THREE.Color("#a3c9b4"),
    bush: new THREE.Color("#3d6b45"),
    flowerTints: [
      "#dfc8c4",
      "#ccd8d4",
      "#d2cad8",
      "#ddd4cc",
      "#c8d4de",
      "#d2e0d4",
      "#d8cfc8",
      "#cbc9d6",
    ] as const,
    pineTrunk: new THREE.Color("#4d362a"),
    pineFoliageDeep: new THREE.Color("#2d4036"),
    pineFoliage: new THREE.Color("#2f4a3d"),
    pineFoliageLight: new THREE.Color("#3d5c4a"),
    pineFoliageBright: new THREE.Color("#5a8c6e"),
    /** Inner cone shadow — keep off pure black so tips stay readable */
    pineAccent: new THREE.Color("#24362c"),
    overlayTop: new THREE.Color("#ffffff"),
    overlayBottom: new THREE.Color("#f0faf5"),
    overlayOpacity: 0.12,
    vignette: 0.35,
    depthFade: 0.55,
    starTint: new THREE.Color("#dde8ff"),
  },
  dark: {
    /**
     * Sunset ridge: sky peach → pink → upper purple (#F7B7A3 … #6C5B7B); fog #C06C84;
     * mountains cool layers (blue → teal → violet); cool-teal tree line; sage grass;
     * violet bush + punchy flower accents; cream moon (#FFF2CC / #FFE29A); cool stars.
     */
    skyTop: new THREE.Color("#6d85b1"),
    skyMid: new THREE.Color("#a99bbf"),
    skyHorizon: new THREE.Color("#e5b0bd"),
    skyBottom: new THREE.Color("#e5b0bd"),
    haze: new THREE.Color("#ead2c2"),
    fogNear: 0.045,
    fogColor: new THREE.Color("#c06c84"),
    /** Horizon haze in sky shader (uGlow) — warm orange-pink bleed */
    sun: new THREE.Color("#f3a683"),
    sunCore: new THREE.Color("#fff2cc"),
    sunRim: new THREE.Color("#ffe29a"),
    /** Back → front: pale blue ridges → indigo shadow → violet-teal foothills (no warm coral) */
    mountainColors: [
      "#b8c9e0",
      "#6e7fa3",
      "#4f5d7a",
      "#5c6488",
      "#4d6f78",
      "#3d5862",
    ] as const,
    treesBack: new THREE.Color("#3d8f78"),
    treesMid: new THREE.Color("#2d6d58"),
    meadow: new THREE.Color("#5a7268"),
    meadowBright: new THREE.Color("#a3c9b4"),
    bush: new THREE.Color("#5a3e6b"),
    /** Periwinkle, lilac, rose — saturated enough to read, softened for twilight calm */
    flowerTints: [
      "#a789d6",
      "#7d8dd4",
      "#e092c0",
      "#8b7ec8",
      "#6d8ad8",
      "#dea0cc",
      "#9b7fd6",
      "#b89fd8",
    ] as const,
    pineTrunk: new THREE.Color("#3a3530"),
    pineFoliageDeep: new THREE.Color("#325d52"),
    pineFoliage: new THREE.Color("#3d7a6c"),
    pineFoliageLight: new THREE.Color("#4e9486"),
    pineFoliageBright: new THREE.Color("#a8d8cc"),
    pineAccent: new THREE.Color("#1f3d35"),
    overlayTop: new THREE.Color("#7a6288"),
    overlayBottom: new THREE.Color("#1a1422"),
    overlayOpacity: 0.15,
    vignette: 0.38,
    depthFade: 0.54,
    starTint: new THREE.Color("#eaefff"),
  },
} as const

// =============================================================================
// Viewport — orthographic framing that fills the window with slight bleed
// =============================================================================

const VIEW_HEIGHT = 10

function updateOrthographicCamera(
  camera: THREE.OrthographicCamera,
  width: number,
  height: number,
) {
  const aspect = Math.max(width / height, 0.0001)
  const halfH = VIEW_HEIGHT / 2
  const halfW = halfH * aspect
  camera.left = -halfW
  camera.right = halfW
  camera.top = halfH
  camera.bottom = -halfH
  camera.updateProjectionMatrix()
}

function bleedDimensions(camera: THREE.OrthographicCamera, margin = 1.08) {
  const w = (camera.right - camera.left) * margin
  const h = (camera.top - camera.bottom) * margin
  return { w, h }
}

// =============================================================================
// Sky — gradient plane with soft horizon glow (shader)
// =============================================================================

function createSkyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uBottom: { value: new THREE.Color() },
      uTime: { value: 0 },
      uGlow: { value: new THREE.Color() },
      uGlowStrength: { value: 0.15 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform vec3 uHorizon;
      uniform vec3 uBottom;
      uniform float uTime;
      uniform vec3 uGlow;
      uniform float uGlowStrength;
      varying vec2 vUv;
      void main() {
        float t = vUv.y;
        vec3 col = mix(uBottom, uHorizon, smoothstep(0.0, 0.42, t));
        col = mix(col, uMid, smoothstep(0.35, 0.72, t));
        col = mix(col, uTop, smoothstep(0.65, 1.0, t));
        float pulse = 0.5 + 0.5 * sin(uTime * 0.15);
        float haze = exp(-pow((vUv.y - 0.35) * 3.2, 2.0)) * (0.08 + 0.02 * pulse);
        col += uGlow * haze * uGlowStrength;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
}

function applySkyTheme(mat: THREE.ShaderMaterial, mode: MeadowThemeMode) {
  const p = THEME[mode]
  mat.uniforms.uTop.value.copy(p.skyTop)
  mat.uniforms.uMid.value.copy(p.skyMid)
  mat.uniforms.uHorizon.value.copy(p.skyHorizon)
  mat.uniforms.uBottom.value.copy(p.skyBottom)
  mat.uniforms.uGlow.value.copy(p.sun)
  mat.uniforms.uGlowStrength.value = mode === "light" ? 0.24 : 0.14
}

/** Radial soft sun / moon — avoids scene fog washing the disk to gray */
function createSoftSunMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCore: { value: new THREE.Color("#fffbf5") },
      uRim: { value: new THREE.Color("#ffd4a8") },
      uTime: { value: 0 },
      uIntensity: { value: 0.92 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uCore;
      uniform vec3 uRim;
      uniform float uTime;
      uniform float uIntensity;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv - 0.5;
        float d = length(p) * 2.0;
        float edge = smoothstep(1.02, 0.55, d);

        float nucleus = exp(-d * d * 30.0);
        float bloom = exp(-d * d * 8.2);
        float veil = exp(-d * d * 2.85);

        float breathe = 0.986 + 0.014 * sin(uTime * 0.19);

        vec3 col = mix(uRim, uCore, clamp(bloom * 1.12, 0.0, 1.0));
        col = mix(col, uCore * vec3(1.03, 1.015, 1.0), nucleus * 0.52);

        float alpha = veil * 0.52 + bloom * 0.34 + nucleus * 0.4;
        alpha = pow(clamp(alpha * edge, 0.0, 1.0), 0.9);
        alpha *= uIntensity * breathe;

        gl_FragColor = vec4(col, alpha);
      }
    `,
  })
}

// =============================================================================
// Mountains & hills — soft stacked silhouettes (ShapeGeometry)
// =============================================================================

/** Silhouette with higher relief at left/right (valley toward center) for editorial depth */
function buildValleyMountainShape(
  width: number,
  seed: number,
  amp: number,
  complexity: number,
  edgeLift: number,
): THREE.Shape {
  const shape = new THREE.Shape()
  const left = -width / 2
  const bottom = -2.2
  shape.moveTo(left, bottom)
  const steps = 64
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = left + t * width
    const distFromCenter = Math.abs(t - 0.5) * 2
    const edge = Math.pow(distFromCenter, 1.28) * edgeLift
    const n1 = Math.sin(t * Math.PI * complexity + seed) * amp
    const n2 = Math.sin(t * Math.PI * (complexity * 2.1) + seed * 1.7) * amp * 0.35
    const n3 = Math.sin(t * Math.PI * 6 + seed * 0.3) * amp * 0.12
    const dip = (1 - distFromCenter) * amp * 0.08
    shape.lineTo(x, n1 + n2 + n3 + 0.4 + edge - dip)
  }
  shape.lineTo(width / 2, bottom)
  shape.lineTo(left, bottom)
  return shape
}

function createMountainMesh(
  color: THREE.Color,
  width: number,
  z: number,
  y: number,
  seed: number,
  amp: number,
  complexity: number,
  edgeLift: number,
): THREE.Mesh {
  const geom = new THREE.ShapeGeometry(buildValleyMountainShape(width, seed, amp, complexity, edgeLift))
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 1,
    depthWrite: true,
    side: THREE.DoubleSide,
    // Scene FogExp2 was washing peaks toward fogColor; keep authored mountain hues
    fog: false,
  })
  const mesh = new THREE.Mesh(geom, mat)
  mesh.position.set(0, y, z)
  return mesh
}

// =============================================================================
// Clouds (light) — soft gradient billboards drifting horizontally
// =============================================================================

function createCloudMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color("#ffffff") },
      uAlpha: { value: 0.45 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uAlpha;
      varying vec2 vUv;
      void main() {
        vec2 c = vUv - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        a *= smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
        gl_FragColor = vec4(uColor, a * uAlpha);
      }
    `,
  })
}

function createCloudLayer(
  count: number,
  spreadW: number,
  yMin: number,
  yMax: number,
  z: number,
  baseScale: number,
): THREE.Group {
  const group = new THREE.Group()
  const mat = createCloudMaterial()
  for (let i = 0; i < count; i++) {
    const geo = new THREE.PlaneGeometry(1, 0.55)
    const m = new THREE.Mesh(geo, mat)
    const sx = baseScale * (0.85 + Math.random() * 0.9)
    const sy = sx * (0.45 + Math.random() * 0.25)
    m.scale.set(sx, sy, 1)
    m.position.set(
      (Math.random() - 0.5) * spreadW,
      yMin + Math.random() * (yMax - yMin),
      z + Math.random() * 0.55,
    )
    m.rotation.z = (Math.random() - 0.5) * 0.08
    m.userData.drift = 0.12 + Math.random() * 0.18
    m.userData.phase = Math.random() * Math.PI * 2
    group.add(m)
  }
  return group
}

// =============================================================================
// Stars (dark) — instanced quads with per-instance twinkle phase
// =============================================================================

function createStarField(count: number, spreadW: number, spreadH: number, z: number): THREE.InstancedMesh {
  const geo = new THREE.PlaneGeometry(0.09, 0.09)
  const phases = new Float32Array(count)
  const scales = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    phases[i] = Math.random() * Math.PI * 2
    scales[i] = 0.72 + Math.random() * 1.45
  }
  geo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1))

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#dde8ff") },
    },
    vertexShader: `
      attribute float aPhase;
      varying float vPhase;
      varying vec2 vUv;
      void main() {
        vPhase = aPhase;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying float vPhase;
      varying vec2 vUv;
      void main() {
        vec2 c = vUv - 0.5;
        /* Readable average with gentler peaks so the field doesn’t read “solid” */
        float tw = 0.7 + 0.3 * sin(uTime * 1.4 + vPhase);
        float d = length(c) * 2.05;
        float a = smoothstep(1.0, 0.0, d) * tw * 0.72;
        gl_FragColor = vec4(uColor * 1.04, min(a, 0.78));
      }
    `,
  })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  const dummy = new THREE.Object3D()
  for (let i = 0; i < count; i++) {
    dummy.position.set((Math.random() - 0.5) * spreadW, (Math.random() - 0.5) * spreadH * 0.85 + 1.5, z + Math.random() * 0.5)
    dummy.scale.setScalar(scales[i])
    dummy.rotation.z = Math.random() * Math.PI
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}

/** Larger four-point sparkles in the sky (dark mode); slow spin + twinkle, kept soft so it stays decorative */
function createSkyStarTwinkleField(count: number, spreadW: number, spreadH: number, z: number): THREE.InstancedMesh {
  const geo = new THREE.PlaneGeometry(0.12, 0.12)
  const phases = new Float32Array(count)
  const scales = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    phases[i] = Math.random() * Math.PI * 2
    scales[i] = 0.82 + Math.random() * 1.15
  }
  geo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1))

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#f0f4ff") },
    },
    vertexShader: `
      attribute float aPhase;
      varying float vPhase;
      varying vec2 vUv;
      void main() {
        vPhase = aPhase;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying float vPhase;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float th = atan(p.y, p.x);
        float spin = uTime * 0.22 + vPhase * 0.12;
        float c = cos(2.0 * (th + spin));
        float s = sin(2.0 * (th + spin));
        float rays = pow(abs(c), 9.0) + pow(abs(s), 9.0);
        float core = exp(-r * r * 32.0);
        float limb = smoothstep(1.02, 0.06, r);
        float shape = core * 0.5 + rays * limb * 1.05;
        float tw = 0.62 + 0.38 * sin(uTime * 1.85 + vPhase);
        float a = min(shape * tw * 0.48, 0.58);
        gl_FragColor = vec4(uColor * 1.05, a);
      }
    `,
  })

  const mesh = new THREE.InstancedMesh(geo, mat, count)
  const dummy = new THREE.Object3D()
  for (let i = 0; i < count; i++) {
    dummy.position.set(
      (Math.random() - 0.5) * spreadW,
      (Math.random() - 0.5) * spreadH * 0.88 + 1.55,
      z + Math.random() * 0.35,
    )
    dummy.scale.setScalar(scales[i])
    dummy.rotation.z = Math.random() * Math.PI
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}

// =============================================================================
// Tree line — staggered conical crowns (illustrated forest silhouette)
// =============================================================================

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Continuous ribbon: ground line + stylized pine crowns (wide base, shelves along each side, sharp apex).
 * Crown height scales up toward left/right screen edges (power curve) for valley perspective; mid row is slightly subtler than back.
 */
function buildForestRibbonShape(
  width: number,
  seed: number,
  preset: "back" | "mid",
): THREE.Shape {
  const rng = mulberry32((Math.floor(seed * 10000) ^ (preset === "mid" ? 0x9e3779b9 : 0)) >>> 0)
  const shape = new THREE.Shape()
  const left = -width / 2
  const right = width / 2
  const baseY = -1.2
  const n = preset === "back" ? 34 : 46
  const cell = width / n

  shape.moveTo(left, baseY)

  for (let i = 0; i < n; i++) {
    const xLo = left + i * cell
    const xHi = left + (i + 1) * cell
    const skew = (rng() - 0.5) * cell * 0.28
    const apx = (xLo + xHi) / 2 + skew

    const hMin = preset === "back" ? 1.38 : 1.3
    const hMax = preset === "back" ? 2.34 : 2.22
    const hBase = hMin + rng() * (hMax - hMin)
    /* Taller at left/right (valley framing): scale height from center dip along a smooth power curve */
    const u = (apx - left) / width
    const distFromCenter = Math.abs(u - 0.5) * 2
    const edgeCurve = Math.pow(distFromCenter, 1.68)
    const edgeBoost = preset === "back" ? 0.52 : 0.42
    const h = hBase * (1 + edgeBoost * edgeCurve)
    const topY = baseY + h

    const crownBaseY = baseY + cell * (0.05 + rng() * 0.05)
    const margin = cell * (0.02 + rng() * 0.02)
    const crownL = xLo + margin
    const crownR = xHi - margin
    const shelfW = cell * (0.1 + rng() * 0.07)

    if (crownL > xLo) shape.lineTo(crownL, baseY)
    shape.lineTo(crownL, crownBaseY)

    const shelfTs = [0.22, 0.42, 0.62, 0.82] as const
    for (const t of shelfTs) {
      const lx = crownL + (apx - crownL) * t - shelfW * Math.sin(t * Math.PI)
      const ly = crownBaseY + (topY - crownBaseY) * t
      shape.lineTo(lx, ly)
    }
    shape.lineTo(apx, topY)

    for (let j = shelfTs.length - 1; j >= 0; j--) {
      const t = shelfTs[j]
      const rx = crownR - (crownR - apx) * t + shelfW * Math.sin(t * Math.PI)
      const ry = crownBaseY + (topY - crownBaseY) * t
      shape.lineTo(rx, ry)
    }
    shape.lineTo(crownR, crownBaseY)
    shape.lineTo(crownR, baseY)
    shape.lineTo(xHi, baseY)
  }

  shape.lineTo(right, baseY)
  shape.lineTo(left, baseY)
  return shape
}

function createTreeLineMesh(
  color: THREE.Color,
  width: number,
  z: number,
  y: number,
  seed: number,
  preset: "back" | "mid",
): THREE.Mesh {
  const geom = new THREE.ShapeGeometry(buildForestRibbonShape(width, seed, preset))
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.98,
    side: THREE.DoubleSide,
    fog: false,
  })
  const mesh = new THREE.Mesh(geom, mat)
  mesh.position.set(0, y, z)
  return mesh
}

// =============================================================================
// Foreground hero pines — high-poly stacked cones + inner shells + trunk
// =============================================================================

type PineLayer = "trunk" | "deep" | "main" | "light" | "accent" | "tip"

function createPineFoliageMaterial(mode: MeadowThemeMode): THREE.ShaderMaterial {
  const p = THEME[mode]
  return new THREE.ShaderMaterial({
    uniforms: {
      uColorTop: { value: p.pineFoliageBright.clone() },
      uColorBottom: { value: p.pineFoliageDeep.clone() },
      uYMin: { value: 0 },
      uYMax: { value: 1 },
    },
    vertexShader: `
      attribute float aTreeY;
      varying float vTreeY;
      void main() {
        vTreeY = aTreeY;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColorTop;
      uniform vec3 uColorBottom;
      uniform float uYMin;
      uniform float uYMax;
      varying float vTreeY;
      void main() {
        float span = max(uYMax - uYMin, 1e-4);
        float t = clamp((vTreeY - uYMin) / span, 0.0, 1.0);
        vec3 col = mix(uColorBottom, uColorTop, t);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    fog: false,
  })
}

/** After all foliage meshes are parented, bake tree-local Y per vertex and set gradient range. */
function finalizePineFoliageGradient(tree: THREE.Group, foliageMat: THREE.ShaderMaterial) {
  tree.updateMatrixWorld(true)
  const tmp = new THREE.Vector3()
  let yMin = Infinity
  let yMax = -Infinity

  tree.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    const layer = obj.userData.pineLayer as PineLayer | undefined
    if (!layer || layer === "trunk") return
    const geom = obj.geometry as THREE.BufferGeometry
    const pos = geom.attributes.position as THREE.BufferAttribute | undefined
    if (!pos) return
    const m = obj.matrix
    for (let i = 0; i < pos.count; i++) {
      tmp.fromBufferAttribute(pos, i).applyMatrix4(m)
      yMin = Math.min(yMin, tmp.y)
      yMax = Math.max(yMax, tmp.y)
    }
  })

  foliageMat.uniforms.uYMin.value = yMin
  foliageMat.uniforms.uYMax.value = yMax

  tree.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    const layer = obj.userData.pineLayer as PineLayer | undefined
    if (!layer || layer === "trunk") return
    const geom = obj.geometry as THREE.BufferGeometry
    const pos = geom.attributes.position as THREE.BufferAttribute
    const arr = new Float32Array(pos.count)
    const m = obj.matrix
    for (let i = 0; i < pos.count; i++) {
      tmp.fromBufferAttribute(pos, i).applyMatrix4(m)
      arr[i] = tmp.y
    }
    geom.setAttribute("aTreeY", new THREE.BufferAttribute(arr, 1))
  })
}

function addFoliageCone(
  parent: THREE.Group,
  radius: number,
  height: number,
  yCenter: number,
  rotY: number,
  layer: PineLayer,
  material: THREE.Material,
  radialSeg: number,
  heightSeg: number,
) {
  const geom = new THREE.ConeGeometry(radius, height, radialSeg, heightSeg, false)
  const mesh = new THREE.Mesh(geom, material)
  mesh.userData.pineLayer = layer
  mesh.position.y = yCenter
  mesh.rotation.y = rotY
  parent.add(mesh)
}

/** Large editorial pine: trunk + stacked cones + inner shells + small side masses */
function createDetailedPineTree(mode: MeadowThemeMode, scale: number, rotY: number): THREE.Group {
  const g = new THREE.Group()
  g.rotation.y = rotY
  const hero = scale >= 1.05
  const coneRadial = hero ? 56 : 34
  const coneHeightSeg = hero ? 14 : 9
  const trunkRadial = hero ? 28 : 18

  const foliageMat = createPineFoliageMaterial(mode)

  const trunkH = 1.05 * scale
  const trunkGeom = new THREE.CylinderGeometry(0.11 * scale, 0.19 * scale, trunkH, trunkRadial, 7, false)
  const trunkMat = new THREE.MeshBasicMaterial({
    color: THEME[mode].pineTrunk.clone(),
    fog: false,
  })
  const trunk = new THREE.Mesh(trunkGeom, trunkMat)
  trunk.userData.pineLayer = "trunk" satisfies PineLayer
  trunk.position.y = trunkH * 0.5
  g.add(trunk)

  let crownBaseY = trunkH * 0.94
  const tiers: { r: number; h: number; layer: PineLayer }[] = [
    { r: 1.38 * scale, h: 1.02 * scale, layer: "deep" },
    { r: 1.18 * scale, h: 0.95 * scale, layer: "main" },
    { r: 0.98 * scale, h: 0.88 * scale, layer: "main" },
    { r: 0.78 * scale, h: 0.78 * scale, layer: "light" },
    { r: 0.58 * scale, h: 0.68 * scale, layer: "light" },
    { r: 0.42 * scale, h: 0.55 * scale, layer: "light" },
    { r: 0.28 * scale, h: 0.42 * scale, layer: "light" },
  ]

  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i]!
    const overlap = i === 0 ? 0.72 : 0.78
    const yCenter = crownBaseY + t.h * 0.5
    const rot = (i * 0.73 + 0.2) * Math.PI + rotY * 0.15
    addFoliageCone(g, t.r, t.h, yCenter, rot, t.layer, foliageMat, coneRadial, coneHeightSeg)
    const isApexTier = i === tiers.length - 1
    if (!isApexTier) {
      addFoliageCone(
        g,
        t.r * 0.88,
        t.h * 0.94,
        yCenter + t.h * 0.04,
        rot + Math.PI / 5.5,
        "accent",
        foliageMat,
        hero ? 44 : 28,
        hero ? 11 : 7,
      )
    }
    crownBaseY += t.h * overlap
  }

  const midY = trunkH + scale * 0.55
  for (let b = 0; b < 5; b++) {
    const ang = (b / 5) * Math.PI * 2 + rotY
    const bx = Math.cos(ang) * scale * 0.52
    const bz = Math.sin(ang) * scale * 0.52
    const br = 0.22 * scale
    const bh = 0.38 * scale
    addFoliageCone(g, br, bh, midY + bh * 0.35, ang * 1.3, "deep", foliageMat, hero ? 32 : 22, hero ? 8 : 5)
    const mesh = g.children[g.children.length - 1] as THREE.Mesh
    mesh.position.x = bx
    mesh.position.z = bz
    mesh.rotation.z = 0.22 * (b % 2 === 0 ? 1 : -1)
    mesh.rotation.x = 0.18
  }

  finalizePineFoliageGradient(g, foliageMat)
  return g
}

function applyForegroundPineTheme(group: THREE.Group, mode: MeadowThemeMode) {
  const p = THEME[mode]
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    const layer = obj.userData.pineLayer as PineLayer | undefined
    if (!layer) return
    const mat = obj.material
    if (layer === "trunk") {
      ;(mat as THREE.MeshBasicMaterial).color.copy(p.pineTrunk)
    } else if (mat instanceof THREE.ShaderMaterial && mat.uniforms.uColorTop) {
      mat.uniforms.uColorTop.value.copy(p.pineFoliageBright)
      mat.uniforms.uColorBottom.value.copy(p.pineFoliageDeep)
    }
  })
}

// =============================================================================
// Meadow foreground — rolling ground + soft grass gradient strip
// =============================================================================

function createMeadowGroundMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uDeep: { value: new THREE.Color() },
      uLight: { value: new THREE.Color() },
      uTime: { value: 0 },
      uFade: { value: 0.5 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uDeep;
      uniform vec3 uLight;
      uniform float uTime;
      uniform float uFade;
      varying vec2 vUv;

      float hash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      void main() {
        float wave = sin(vUv.x * 20.0 + uTime * 0.4) * 0.03 + sin(vUv.x * 35.0 - uTime * 0.25) * 0.015;
        float g = vUv.y + wave;
        vec3 col = mix(uDeep, uLight, smoothstep(0.0, 1.0, g));

        vec2 gp = vUv * vec2(62.0, 44.0);
        float n = noise(gp + vec2(uTime * 0.018, uTime * 0.011));
        float n2 = noise(gp * 2.7 + vec2(19.2, 8.4));
        float n3 = noise(gp * 6.5 + vec2(3.1, 27.0));
        float blade = sin(vUv.x * 240.0 + n * 5.5 + uTime * 0.55)
          * sin(vUv.y * 160.0 + n2 * 4.0 - uTime * 0.35);
        blade = smoothstep(0.15, 0.88, blade * 0.5 + 0.5);
        float tuft = smoothstep(0.35, 0.92, n3);

        col *= 0.9 + 0.14 * n + 0.08 * n2 + 0.06 * tuft;
        col += uLight * (0.035 * blade + 0.022 * n3);

        float topSoft = smoothstep(0.85, 0.35, vUv.y);
        col = mix(col, col * (1.0 - uFade * 0.35), topSoft);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
}

const FLOWER_ATLAS_COLS = 3

/** Three soft sprites in one row: conical bloom · daisy rays · four-petal cross (tint in shader) */
function createFlowerAtlasTexture(): THREE.CanvasTexture {
  const cell = 128
  const canvas = document.createElement("canvas")
  canvas.width = cell * FLOWER_ATLAS_COLS
  canvas.height = cell
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D not available")

  const drawBloom = (ox: number) => {
    const cx = ox + cell / 2
    const cy = cell / 2
    const petalCount = 5
    const outerR = cell * 0.42
    for (let i = 0; i < petalCount; i++) {
      const a0 = ((i - 0.5) / petalCount) * Math.PI * 2 - Math.PI / 2
      const a1 = ((i + 0.5) / petalCount) * Math.PI * 2 - Math.PI / 2
      const am = (a0 + a1) / 2
      const mx = cx + Math.cos(am) * outerR * 0.24
      const my = cy + Math.sin(am) * outerR * 0.24
      const grd = ctx.createRadialGradient(mx, my, cell * 0.02, cx, cy, outerR * 0.95)
      grd.addColorStop(0, "rgba(255,255,255,0.98)")
      grd.addColorStop(0.4, "rgba(255,255,255,0.48)")
      grd.addColorStop(1, "rgba(255,255,255,0)")
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, outerR, a0, a1, false)
      ctx.closePath()
      ctx.fill()
    }
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cell * 0.1)
    cg.addColorStop(0, "rgba(255,250,242,0.88)")
    cg.addColorStop(0.65, "rgba(255,245,230,0.25)")
    cg.addColorStop(1, "rgba(255,245,230,0)")
    ctx.fillStyle = cg
    ctx.beginPath()
    ctx.arc(cx, cy, cell * 0.09, 0, Math.PI * 2)
    ctx.fill()
  }

  const drawDaisy = (ox: number) => {
    const cx = ox + cell / 2
    const cy = cell / 2
    const rays = 16
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2
      const grd = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * cell * 0.44, cy + Math.sin(a) * cell * 0.44)
      grd.addColorStop(0, "rgba(255,255,255,0.95)")
      grd.addColorStop(0.55, "rgba(255,255,255,0.35)")
      grd.addColorStop(1, "rgba(255,255,255,0)")
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, cell * 0.4, a - 0.11, a + 0.11)
      ctx.closePath()
      ctx.fill()
    }
    const disk = ctx.createRadialGradient(cx, cy, 0, cx, cy, cell * 0.11)
    disk.addColorStop(0, "rgba(255,252,248,0.9)")
    disk.addColorStop(0.7, "rgba(255,248,240,0.35)")
    disk.addColorStop(1, "rgba(255,248,240,0)")
    ctx.fillStyle = disk
    ctx.beginPath()
    ctx.arc(cx, cy, cell * 0.1, 0, Math.PI * 2)
    ctx.fill()
  }

  const drawCross = (ox: number) => {
    const cx = ox + cell / 2
    const cy = cell / 2
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(a)
      ctx.translate(0, -cell * 0.14)
      const grd = ctx.createRadialGradient(0, -cell * 0.18, 1, 0, -cell * 0.2, cell * 0.24)
      grd.addColorStop(0, "rgba(255,255,255,0.98)")
      grd.addColorStop(0.45, "rgba(255,255,255,0.45)")
      grd.addColorStop(1, "rgba(255,255,255,0)")
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.ellipse(0, -cell * 0.16, cell * 0.11, cell * 0.22, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    const c2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, cell * 0.08)
    c2.addColorStop(0, "rgba(255,250,245,0.85)")
    c2.addColorStop(1, "rgba(255,250,245,0)")
    ctx.fillStyle = c2
    ctx.beginPath()
    ctx.arc(cx, cy, cell * 0.075, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  drawBloom(0)
  drawDaisy(cell)
  drawCross(cell * 2)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.generateMipmaps = false
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  return tex
}

type FlowerLayout = {
  bx: number
  by: number
  z0: number
  rot: number
  s: number
  sway: number
  swayPh: number
}

/** World-space scatter box in `layerMeadow` (same parent as the meadow plane) */
type FlowerScatterBounds = {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  zMin: number
  zMax: number
}

function createFlowerField(
  count: number,
  bounds: FlowerScatterBounds,
  flowerTints: readonly string[],
  texture: THREE.CanvasTexture,
): {
  group: THREE.Group
  mesh: THREE.InstancedMesh
  tintAttr: THREE.InstancedBufferAttribute
  layout: FlowerLayout[]
} {
  const geo = new THREE.PlaneGeometry(1, 1)
  const tintArr = new Float32Array(count * 3)
  const tmpC = new THREE.Color()
  for (let i = 0; i < count; i++) {
    tmpC.set(flowerTints[i % flowerTints.length]!)
    tintArr[i * 3] = tmpC.r
    tintArr[i * 3 + 1] = tmpC.g
    tintArr[i * 3 + 2] = tmpC.b
  }
  const tintAttr = new THREE.InstancedBufferAttribute(tintArr, 3)
  geo.setAttribute("instanceTint", tintAttr)

  const kindArr = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    kindArr[i] = Math.floor(Math.random() * FLOWER_ATLAS_COLS)
  }
  const kindAttr = new THREE.InstancedBufferAttribute(kindArr, 1)
  geo.setAttribute("instanceKind", kindAttr)

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
    uniforms: {
      map: { value: texture },
      uAtlasCols: { value: FLOWER_ATLAS_COLS },
    },
    vertexShader: `
      attribute vec3 instanceTint;
      attribute float instanceKind;
      varying vec2 vUv;
      varying vec3 vTint;
      varying float vKind;
      void main() {
        vUv = uv;
        vTint = instanceTint;
        vKind = instanceKind;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform float uAtlasCols;
      varying vec2 vUv;
      varying vec3 vTint;
      varying float vKind;
      void main() {
        vec2 atlasUv = vec2((vKind + vUv.x) / uAtlasCols, vUv.y);
        vec4 tex = texture2D(map, atlasUv);
        if (tex.a < 0.3) discard;
        vec3 rgb = tex.rgb * vTint;
        gl_FragColor = vec4(rgb, tex.a);
      }
    `,
  })

  const mesh = new THREE.InstancedMesh(geo, mat, count)
  const dummy = new THREE.Object3D()
  const layout: FlowerLayout[] = []
  const { xMin, xMax, yMin, yMax, zMin, zMax } = bounds
  const rx = xMax - xMin
  const ry = yMax - yMin
  const rz = zMax - zMin
  /** Upper ~58% of the grass strip gets most placements (denser toward horizon) */
  const yDenseLo = yMin + ry * 0.38
  for (let i = 0; i < count; i++) {
    const bx = xMin + Math.random() * rx
    const by =
      Math.random() < 0.68
        ? yDenseLo + Math.random() * (yMax - yDenseLo)
        : yMin + Math.random() * (yDenseLo - yMin)
    const z0 = zMin + Math.random() * rz
    const rot = (Math.random() - 0.5) * 0.95
    const t = ry > 1e-6 ? (by - yMin) / ry : 0
    const heightShrink = 1.12 - 0.78 * Math.pow(Math.min(Math.max(t, 0), 1), 0.9)
    const s = (0.28 + Math.random() * 0.26) * heightShrink
    const swayBase = 0.008 + Math.random() * 0.016
    const sway = swayBase * (0.5 + 0.5 * (1 - t))
    layout.push({
      bx,
      by,
      z0,
      rot,
      s,
      sway,
      swayPh: Math.random() * Math.PI * 2,
    })
    dummy.position.set(bx, by, z0)
    dummy.rotation.z = rot
    dummy.scale.setScalar(s)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
  mesh.instanceMatrix.needsUpdate = true

  const group = new THREE.Group()
  group.add(mesh)
  return { group, mesh, tintAttr, layout }
}

// =============================================================================
// Atmospheric overlay — vignette + vertical haze (fullscreen quad)
// =============================================================================

function createAtmosphereMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uColorTop: { value: new THREE.Color() },
      uColorBot: { value: new THREE.Color() },
      uOpacity: { value: 0.15 },
      uVignette: { value: 0.4 },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColorTop;
      uniform vec3 uColorBot;
      uniform float uOpacity;
      uniform float uVignette;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv;
        vec3 col = mix(uColorBot, uColorTop, uv.y);
        vec2 c = uv - 0.5;
        float vig = 1.0 - dot(c, c) * uVignette * 3.2;
        vig = clamp(vig, 0.0, 1.0);
        float haze = 0.5 + 0.5 * sin(uTime * 0.2 + uv.y * 4.0);
        float a = uOpacity * (0.85 + 0.15 * haze) * vig;
        gl_FragColor = vec4(col, a);
      }
    `,
  })
}

// =============================================================================
// Theme application — colors & layer visibility
// =============================================================================

function applyLandscapeTheme(
  mode: MeadowThemeMode,
  refs: {
    mountains: THREE.Mesh[]
    treesBack: THREE.Mesh
    treesMid: THREE.Mesh
    meadowMat: THREE.ShaderMaterial
    flowerTintAttr: THREE.InstancedBufferAttribute
    flowerCount: number
    foregroundPines: THREE.Group
    cloudGroup: THREE.Group
    stars: THREE.InstancedMesh
    skyStarTwinkles: THREE.InstancedMesh
    atmosphere: THREE.ShaderMaterial
    sunMesh: THREE.Mesh
  },
) {
  const p = THEME[mode]
  refs.mountains.forEach((mesh, i) => {
    const hex = p.mountainColors[Math.min(i, p.mountainColors.length - 1)]
    ;(mesh.material as THREE.MeshBasicMaterial).color.set(hex)
  })
  ;(refs.treesBack.material as THREE.MeshBasicMaterial).color.copy(p.treesBack)
  ;(refs.treesMid.material as THREE.MeshBasicMaterial).color.copy(p.treesMid)
  refs.meadowMat.uniforms.uDeep.value.copy(p.meadow)
  refs.meadowMat.uniforms.uLight.value.copy(p.meadowBright)
  refs.meadowMat.uniforms.uFade.value = p.depthFade
  refs.cloudGroup.visible = mode === "light"
  refs.stars.visible = mode === "dark"
  refs.skyStarTwinkles.visible = mode === "dark"
  ;(refs.stars.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(p.starTint)
  ;(refs.skyStarTwinkles.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(p.starTint)
  const sunM = refs.sunMesh.material as THREE.ShaderMaterial
  sunM.uniforms.uCore.value.copy(p.sunCore)
  sunM.uniforms.uRim.value.copy(p.sunRim)
  refs.atmosphere.uniforms.uColorTop.value.copy(p.overlayTop)
  refs.atmosphere.uniforms.uColorBot.value.copy(p.overlayBottom)
  refs.atmosphere.uniforms.uOpacity.value = p.overlayOpacity
  refs.atmosphere.uniforms.uVignette.value = p.vignette

  const arr = refs.flowerTintAttr.array as Float32Array
  const tints = p.flowerTints
  const c = new THREE.Color()
  for (let i = 0; i < refs.flowerCount; i++) {
    c.set(tints[i % tints.length]!)
    arr[i * 3] = c.r
    arr[i * 3 + 1] = c.g
    arr[i * 3 + 2] = c.b
  }
  refs.flowerTintAttr.needsUpdate = true
  applyForegroundPineTheme(refs.foregroundPines, mode)
}

// =============================================================================
// React — full-viewport canvas, resize, pointer parallax, animation loop
// =============================================================================

export type MeadowSceneProps = {
  /** When `"auto"`, reads `document.documentElement` class `dark` if available in browser */
  theme?: MeadowThemeMode | "auto"
}

function resolveTheme(prop: MeadowSceneProps["theme"]): MeadowThemeMode {
  if (prop === "dark" || prop === "light") return prop
  if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
    return "dark"
  }
  return "light"
}

export function MeadowScene({ theme: themeProp = "auto" }: MeadowSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const applyThemeRef = useRef<((mode: MeadowThemeMode) => void) | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    // Subtle depth cue without washing out illustration colors
    scene.fog = new THREE.FogExp2(THEME.light.fogColor.clone(), THEME.light.fogNear * 0.65)

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200)
    camera.position.set(0, 0, 22)
    camera.lookAt(0, 0, -30)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 1)
    renderer.domElement.style.position = "absolute"
    renderer.domElement.style.inset = "0"
    renderer.domElement.style.width = "100%"
    renderer.domElement.style.height = "100%"
    renderer.domElement.style.display = "block"
    container.appendChild(renderer.domElement)

    let width = container.clientWidth
    let height = container.clientHeight
    renderer.setSize(width, height, false)
    updateOrthographicCamera(camera, width, height)
    const { w, h } = bleedDimensions(camera)
    const baseBleedW = w
    const cloudWrapLimit = baseBleedW * 0.65

    const worldGroup = new THREE.Group()
    scene.add(worldGroup)

    // --- Layer groups (parallax multipliers on userData) ---
    const layerSky = new THREE.Group()
    layerSky.userData.parallax = 0.02

    const skyGeom = new THREE.PlaneGeometry(w * 1.2, h * 1.2)
    const skyMat = createSkyMaterial()
    const skyMesh = new THREE.Mesh(skyGeom, skyMat)
    skyMesh.position.z = -78
    layerSky.add(skyMesh)

    const sunSize = h * 0.3
    const sunGeom = new THREE.PlaneGeometry(sunSize, sunSize)
    const sunMat = createSoftSunMaterial()
    const sunMesh = new THREE.Mesh(sunGeom, sunMat)
    sunMesh.position.set(-w * 0.22, h * 0.18, -75.6)
    layerSky.add(sunMesh)

    const skyStarTwinkles = createSkyStarTwinkleField(48, w * 1.08, h, -76.2)
    skyStarTwinkles.visible = false
    layerSky.add(skyStarTwinkles)

    const layerMountains = new THREE.Group()
    layerMountains.userData.parallax = 0.04

    const mountainSpecs = [
      { z: -75, y: -0.38, width: 1.2, seed: 1.05, amp: 0.52, complexity: 2.0, edge: 0.42 },
      { z: -72, y: -0.52, width: 1.18, seed: 2.35, amp: 0.6, complexity: 2.35, edge: 0.52 },
      { z: -69, y: -0.66, width: 1.16, seed: 0.55, amp: 0.7, complexity: 2.75, edge: 0.64 },
      { z: -66, y: -0.82, width: 1.14, seed: 3.05, amp: 0.8, complexity: 3.05, edge: 0.78 },
      { z: -61, y: -1.0, width: 1.12, seed: 1.85, amp: 0.92, complexity: 3.45, edge: 0.92 },
      { z: -56, y: -1.18, width: 1.1, seed: 2.65, amp: 1.02, complexity: 3.85, edge: 1.08 },
    ] as const

    const mountains: THREE.Mesh[] = mountainSpecs.map((spec, i) => {
      const col = new THREE.Color(THEME.light.mountainColors[i] ?? THEME.light.mountainColors[0])
      return createMountainMesh(
        col,
        w * spec.width,
        spec.z,
        spec.y,
        spec.seed,
        spec.amp,
        spec.complexity,
        spec.edge,
      )
    })
    layerMountains.add(...mountains)

    const cloudYMin = -h * 0.08
    const cloudYMax = h * 0.49
    const cloudGroup = createCloudLayer(26, w * 1.18, cloudYMin, cloudYMax, -62, 2.05)
    cloudGroup.userData.parallax = 0.035

    const stars = createStarField(150, w * 1.05, h, -70)
    stars.userData.parallax = 0.025
    stars.visible = false

    const layerTrees = new THREE.Group()
    layerTrees.userData.parallax = 0.055
    const treesBack = createTreeLineMesh(THEME.light.treesBack.clone(), w * 1.08, -40, -1.85, 1.7, "back")
    const treesMid = createTreeLineMesh(THEME.light.treesMid.clone(), w * 1.06, -32, -2.05, 4.2, "mid")
    treesMid.position.x = w * 0.025
    layerTrees.add(treesBack, treesMid)

    const layerMeadow = new THREE.Group()
    layerMeadow.userData.parallax = 0.08
    const meadowGeom = new THREE.PlaneGeometry(w * 1.12, 4.2, 28, 12)
    const meadowMat = createMeadowGroundMaterial()
    meadowMat.uniforms.uDeep.value.copy(THEME.light.meadow)
    meadowMat.uniforms.uLight.value.copy(THEME.light.meadowBright)
    meadowMat.uniforms.uFade.value = THEME.light.depthFade
    const meadowMesh = new THREE.Mesh(meadowGeom, meadowMat)
    meadowMesh.position.set(0, -h * 0.42, -22)
    layerMeadow.add(meadowMesh)

    const flowerTexture = createFlowerAtlasTexture()
    const meadowHalfW = (w * 1.12) / 2
    const meadowHalfH = 4.2 / 2
    const meadowCenterY = -h * 0.42
    const meadowZ = -22
    const flowers = createFlowerField(
      96,
      {
        xMin: -meadowHalfW * 0.9,
        xMax: meadowHalfW * 0.9,
        yMin: meadowCenterY - meadowHalfH * 0.8,
        /* Upper edge of meadow quad (grass meets sky) — was 0.75·halfH, flowers stopped short */
        yMax: meadowCenterY + meadowHalfH * 0.985,
        zMin: meadowZ + 0.6,
        zMax: meadowZ + 7.5,
      },
      THEME.light.flowerTints,
      flowerTexture,
    )
    flowers.group.userData.parallax = 0.1
    layerMeadow.add(flowers.group)

    const layerForegroundPines = new THREE.Group()
    layerForegroundPines.userData.parallax = 0.15
    const pineMode = resolveTheme(themeProp)
    const pineHeroL = createDetailedPineTree(pineMode, 1.72, 0.12)
    pineHeroL.position.set(-w * 0.445, -h * 0.508, -7.25)
    layerForegroundPines.add(pineHeroL)
    const pineFlankL = createDetailedPineTree(pineMode, 1.18, -0.35)
    pineFlankL.position.set(-w * 0.355, -h * 0.468, -8.45)
    layerForegroundPines.add(pineFlankL)
    const pineHeroR = createDetailedPineTree(pineMode, 1.68, -0.1)
    pineHeroR.position.set(w * 0.448, -h * 0.505, -7.32)
    layerForegroundPines.add(pineHeroR)
    const pineFlankR = createDetailedPineTree(pineMode, 1.15, 0.28)
    pineFlankR.position.set(w * 0.362, -h * 0.465, -8.5)
    layerForegroundPines.add(pineFlankR)

    worldGroup.add(layerSky, layerMountains, cloudGroup, stars, layerTrees, layerMeadow, layerForegroundPines)

    const atmosphereMat = createAtmosphereMaterial()
    const atmosphereMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), atmosphereMat)
    atmosphereMesh.frustumCulled = false
    scene.add(atmosphereMesh)

    const landscapeRefs = {
      mountains,
      treesBack,
      treesMid,
      meadowMat,
      flowerTintAttr: flowers.tintAttr,
      flowerCount: flowers.layout.length,
      foregroundPines: layerForegroundPines,
      cloudGroup,
      stars,
      skyStarTwinkles,
      atmosphere: atmosphereMat,
      sunMesh,
    }

    const flowerDummy = new THREE.Object3D()

    const parallaxLayers = [
      layerSky,
      layerMountains,
      cloudGroup,
      stars,
      layerTrees,
      layerMeadow,
      layerForegroundPines,
    ]

    const applyTheme = (mode: MeadowThemeMode) => {
      applySkyTheme(skyMat, mode)
      applyLandscapeTheme(mode, landscapeRefs)
      const fogCol = THEME[mode].fogColor.clone()
      ;(scene.fog as THREE.FogExp2).color.copy(fogCol)
      ;(scene.fog as THREE.FogExp2).density = THEME[mode].fogNear
      sunMesh.visible = true
      const sunSm = sunMesh.material as THREE.ShaderMaterial
      sunSm.uniforms.uIntensity.value = mode === "light" ? 0.96 : 0.42
    }

    applyTheme(resolveTheme(themeProp))
    applyThemeRef.current = applyTheme

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    const onMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX / width - 0.5) * 2
      pointer.ty = (e.clientY / height - 0.5) * 2
    }
    window.addEventListener("pointermove", onMove)

    const clock = new THREE.Clock()
    let raf = 0

    const animate = () => {
      const t = clock.getElapsedTime()
      skyMat.uniforms.uTime.value = t
      meadowMat.uniforms.uTime.value = t
      atmosphereMat.uniforms.uTime.value = t
      ;(sunMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = t

      pointer.x += (pointer.tx - pointer.x) * 0.04
      pointer.y += (pointer.ty - pointer.y) * 0.04

      parallaxLayers.forEach((group) => {
        const k = (group.userData.parallax as number) ?? 0
        group.position.x = pointer.x * k * 0.45
        group.position.y = pointer.y * k * 0.28
      })

      if (cloudGroup.visible) {
        cloudGroup.children.forEach((ch) => {
          const m = ch as THREE.Mesh
          const drift = (m.userData.drift as number) ?? 0.15
          const phase = (m.userData.phase as number) ?? 0
          m.position.x += drift * 0.006
          m.position.y += Math.sin(t * 0.3 + phase) * 0.0004
          if (m.position.x > cloudWrapLimit) m.position.x = -cloudWrapLimit
        })
      }

      if (stars.visible) {
        const sm = stars.material as THREE.ShaderMaterial
        sm.uniforms.uTime.value = t
      }
      if (skyStarTwinkles.visible) {
        const tm = skyStarTwinkles.material as THREE.ShaderMaterial
        tm.uniforms.uTime.value = t
      }

      flowers.layout.forEach((L, i) => {
        flowerDummy.position.set(
          L.bx + Math.sin(t * 0.55 + L.swayPh) * L.sway,
          L.by + Math.sin(t * 0.4 + L.swayPh * 1.3) * L.sway * 0.62,
          L.z0,
        )
        flowerDummy.rotation.z = L.rot
        flowerDummy.scale.setScalar(L.s)
        flowerDummy.updateMatrix()
        flowers.mesh.setMatrixAt(i, flowerDummy.matrix)
      })
      flowers.mesh.instanceMatrix.needsUpdate = true

      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    animate()

    const onResize = () => {
      width = container.clientWidth
      height = container.clientHeight
      renderer.setSize(width, height, false)
      updateOrthographicCamera(camera, width, height)
      const dim = bleedDimensions(camera)
      const sx = dim.w / baseBleedW
      worldGroup.scale.set(sx, 1, 1)
    }

    const ro = new ResizeObserver(onResize)
    ro.observe(container)

    return () => {
      applyThemeRef.current = null
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener("pointermove", onMove)
      renderer.dispose()
      container.removeChild(renderer.domElement)

      const materials = new Set<THREE.Material>()
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
          obj.geometry?.dispose()
          const mat = obj.material
          if (Array.isArray(mat)) mat.forEach((m) => materials.add(m))
          else if (mat) materials.add(mat)
        }
      })
      materials.forEach((m) => m.dispose())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once; `themeProp` updates uniforms via `applyThemeRef`
  }, [])

  useEffect(() => {
    applyThemeRef.current?.(resolveTheme(themeProp))
  }, [themeProp])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 h-full w-full overflow-hidden"
      aria-hidden
    />
  )
}
