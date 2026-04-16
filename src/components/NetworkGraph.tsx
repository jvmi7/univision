import { OrbitControls } from "@react-three/drei"
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber"
import { Bloom, EffectComposer } from "@react-three/postprocessing"
import {
  type ComponentRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import * as THREE from "three"

import {
  NETWORK_CONFIG,
  PARTICLE_PINK_COLORS,
} from "@/lib/constants"
import { generateLogoTargets } from "@/lib/generateLogoTargets"
import { generateMockData, type NetworkData, type NetworkNode } from "@/lib/generateMockData"

type NetworkGraphProps = {
  exploreSignal: number
  onSelectionChange: (node: NetworkNode | null) => void
  onTooltipPositionChange: (position: { x: number; y: number } | null) => void
  scrollProgress: number
}

function createDeterministicRandom(seed: number) {
  let state = seed

  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function createNodeMaterial() {
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.96,
    vertexColors: true,
  })

  material.toneMapped = false
  material.depthWrite = false
  material.blending = THREE.AdditiveBlending
  material.emissive = new THREE.Color("#ff62cd")
  material.emissiveIntensity = 0.72

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute float instanceAura;
        attribute float instanceState;
        varying float vInstanceAura;
        varying float vInstanceState;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vInstanceAura = instanceAura;
        vInstanceState = instanceState;`
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying float vInstanceAura;
        varying float vInstanceState;`
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        diffuseColor.rgb *= mix(0.03, 1.0, vInstanceState);`
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * (0.45 + vInstanceAura * 2.2) * vInstanceState;`
      )
  }

  material.customProgramCacheKey = () => "univision-instanced-nodes"

  return material
}

function NetworkScene({
  data,
  resetSignal,
  onSelectionChange,
  onTooltipPositionChange,
  scrollProgress,
}: {
  data: NetworkData
  resetSignal: number
  onSelectionChange: (node: NetworkNode | null) => void
  onTooltipPositionChange: (position: { x: number; y: number } | null) => void
  scrollProgress: number
}) {
  const { camera, size, invalidate } = useThree()
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const nodesRef = useRef<THREE.InstancedMesh>(null)
  const frameCounterRef = useRef(0)
  const selectedNodeIdRef = useRef<number | null>(null)
  const tooltipPositionRef = useRef<{ x: number; y: number } | null>(null)
  const focusTargetRef = useRef<{
    cameraPosition: THREE.Vector3
    controlsTarget: THREE.Vector3
  } | null>(null)
  const scrollProgressRef = useRef(scrollProgress)
  const previousScrollProgressRef = useRef(scrollProgress)
  const scrollActivityRef = useRef(0)

  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null)

  const tempObject = useMemo(() => new THREE.Object3D(), [])
  const projectedVector = useMemo(() => new THREE.Vector3(), [])
  const defaultCameraPosition = useMemo(() => new THREE.Vector3(0, 2, 72), [])
  const defaultTargetPosition = useMemo(() => new THREE.Vector3(0, 0, 0), [])
  const zoomOutCameraPosition = useMemo(() => new THREE.Vector3(0, 10, 112), [])
  const zoomOutTargetPosition = useMemo(() => new THREE.Vector3(0, -4, 0), [])
  const cameraTransitionVector = useMemo(() => new THREE.Vector3(), [])
  const targetTransitionVector = useMemo(() => new THREE.Vector3(), [])
  const animatedNodePositions = useMemo(
    () =>
      data.nodes.map(
        (node) => new THREE.Vector3(node.position[0], node.position[1], node.position[2])
      ),
    [data.nodes]
  )
  const targetNodePositions = useMemo(
    () =>
      data.nodes.map(
        (node) => new THREE.Vector3(node.position[0], node.position[1], node.position[2])
      ),
    [data.nodes]
  )

  const nodePositions = useMemo(
    () =>
      data.nodes.map(
        (node) => new THREE.Vector3(node.position[0], node.position[1], node.position[2])
      ),
    [data.nodes]
  )

  const logoTargets = useMemo(() => generateLogoTargets(data.nodes.length), [data.nodes.length])
  const orbTargets = useMemo(() => {
    const random = createDeterministicRandom(8_271_451)

    return Array.from({ length: data.nodes.length }, (_, index) => {
      const theta = random() * Math.PI * 2
      const phi = Math.acos(2 * random() - 1)
      const radius = 28 + Math.cbrt(random()) * 52
      const sinPhi = Math.sin(phi)
      const shellBias = 0.9 + random() * 0.18

      return new THREE.Vector3(
        radius * sinPhi * Math.cos(theta) * shellBias + Math.sin(index * 0.17) * 4,
        radius * sinPhi * Math.sin(theta) * shellBias + Math.cos(index * 0.11) * 4,
        radius * Math.cos(phi) * shellBias + Math.sin(index * 0.07) * 5
      )
    })
  }, [data.nodes.length])

  const motionSeeds = useMemo(
    () =>
      data.nodes.map((node, index) => {
        const base = nodePositions[index].clone().normalize()
        const tangent = new THREE.Vector3(-base.y || 0.4, base.x || 0.2, 0.3)
          .normalize()
        const bitangent = new THREE.Vector3().crossVectors(base, tangent).normalize()

        return {
          amplitude: 0.18 + (node.auraScore / 100) * 0.42,
          pulseAmplitude: 0.015 + (node.auraScore / 100) * 0.032,
          speed: 0.18 + (index % 11) * 0.012,
          phase: index * 0.173,
          normal: base,
          tangent,
          bitangent,
        }
      }),
    [data.nodes, nodePositions]
  )

  const baseScales = useMemo(
    () =>
      Float32Array.from(
        data.nodes.map((node) => 0.045 + (node.auraScore / 100) * 0.21)
      ),
    [data.nodes]
  )

  const nodeGeometry = useMemo(() => {
    const geometry = new THREE.SphereGeometry(1, 16, 16)
    geometry.computeBoundingSphere()
    return geometry
  }, [])

  const nodeMaterial = useMemo(() => createNodeMaterial(), [])

  const auraAttribute = useMemo(
    () =>
      new THREE.InstancedBufferAttribute(
        Float32Array.from(data.nodes.map((node) => node.auraScore / 100)),
        1
      ),
    [data.nodes]
  )

  const stateAttribute = useMemo(
    () =>
      new THREE.InstancedBufferAttribute(
        new Float32Array(data.nodes.length).fill(1),
        1
      ),
    [data.nodes.length]
  )

  const updateNodeMatrices = useCallback(
    (cameraDistance: number, elapsedTime: number, deltaTime: number) => {
      const instancedMesh = nodesRef.current
      if (!instancedMesh) {
        return
      }

      const isFar = cameraDistance > NETWORK_CONFIG.farDistance
      const isMedium =
        cameraDistance <= NETWORK_CONFIG.farDistance &&
        cameraDistance > NETWORK_CONFIG.nearDistance
      const clusterProgress = THREE.MathUtils.smootherstep(scrollProgressRef.current, 0.06, 0.46)
      const settleProgress = THREE.MathUtils.smootherstep(scrollProgressRef.current, 0.4, 0.62)
      const positionLerpAlpha = 1 - Math.exp(-deltaTime * 12)
      const idleFloatProgress =
        selectedNodeIdRef.current === null
          ? THREE.MathUtils.smootherstep(1 - Math.min(scrollActivityRef.current, 1), 0.3, 0.98)
          : 0
      const idleFloatStrength = THREE.MathUtils.lerp(0.18, 0.78, idleFloatProgress)

      for (let index = 0; index < data.nodes.length; index += 1) {
        const basePosition = nodePositions[index]
        const logoTarget = logoTargets[index]
        const orbTarget = orbTargets[index]
        const animatedPosition = animatedNodePositions[index]
        const targetPosition = targetNodePositions[index]
        const motion = motionSeeds[index]
        const wave = elapsedTime * motion.speed + motion.phase

        targetPosition.copy(basePosition)

        if (logoTarget) {
          targetPosition.lerp(logoTarget.position, logoTarget.influence)
        }

        if (orbTarget && clusterProgress > 0) {
          targetPosition.lerp(orbTarget, clusterProgress)
        }

        const logoStability = logoTarget ? THREE.MathUtils.lerp(1, 0.025, logoTarget.influence) : 1
        const clusterStability = THREE.MathUtils.lerp(logoStability, 0.2, clusterProgress)
        const baseMotionStability = THREE.MathUtils.lerp(clusterStability, 0.03, settleProgress)
        const motionStability = Math.max(
          baseMotionStability,
          idleFloatStrength * (1 - settleProgress * 0.55)
        )
        const offsetA = Math.sin(wave) * motion.amplitude * 1.45 * motionStability
        const offsetB = Math.cos(wave * 0.7) * motion.amplitude * 1.18 * motionStability
        const offsetC =
          Math.sin(wave * 0.45 + motion.phase * 0.5) *
          motion.amplitude *
          0.95 *
          motionStability

        targetPosition
          .addScaledVector(motion.tangent, offsetA)
          .addScaledVector(motion.bitangent, offsetB)
          .addScaledVector(motion.normal, offsetC)

        animatedPosition.lerp(targetPosition, positionLerpAlpha)

        const position = animatedPosition
        const baseScale = baseScales[index]
        const zoomScale = isFar ? 0.72 : isMedium ? 0.9 : 1.08
        const frustumBoost = isMedium ? 1.04 : 1
        const selectedBoost = selectedNodeIdRef.current === index ? 1.75 : 1
        const animatedPulse = 1 + Math.sin(wave * 1.4) * motion.pulseAmplitude
        const pulse = THREE.MathUtils.lerp(animatedPulse, 1, settleProgress)
        const scale = baseScale * zoomScale * frustumBoost * selectedBoost * pulse

        tempObject.position.copy(position)
        tempObject.scale.setScalar(scale)
        tempObject.updateMatrix()
        instancedMesh.setMatrixAt(index, tempObject.matrix)
      }

      instancedMesh.instanceMatrix.needsUpdate = true
    },
    [
      animatedNodePositions,
      baseScales,
      data.nodes.length,
      orbTargets,
      logoTargets,
      motionSeeds,
      nodePositions,
      targetNodePositions,
      tempObject,
    ]
  )

  useLayoutEffect(() => {
    const instancedMesh = nodesRef.current
    if (!instancedMesh) {
      return
    }

    const colorRandom = createDeterministicRandom(91_337)
    const colors = data.nodes.map((node) => {
      const color =
        new THREE.Color(
          PARTICLE_PINK_COLORS[
            Math.floor(colorRandom() * PARTICLE_PINK_COLORS.length)
          ]
        )
      const auraTint = THREE.MathUtils.lerp(0.03, 0.1, node.auraScore / 100)
      return color.lerp(new THREE.Color("#ffd6f4"), auraTint)
    })

    for (let index = 0; index < data.nodes.length; index += 1) {
      tempObject.position.copy(animatedNodePositions[index])
      tempObject.scale.setScalar(baseScales[index])
      tempObject.updateMatrix()
      instancedMesh.setMatrixAt(index, tempObject.matrix)
      instancedMesh.setColorAt(index, colors[index])
    }

    instancedMesh.geometry.setAttribute("instanceAura", auraAttribute)
    instancedMesh.geometry.setAttribute("instanceState", stateAttribute)
    instancedMesh.instanceMatrix.needsUpdate = true

    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true
    }

    invalidate()
  }, [
    auraAttribute,
    baseScales,
    data.nodes,
    invalidate,
    animatedNodePositions,
    nodePositions,
    stateAttribute,
    tempObject,
  ])

  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId
  }, [selectedNodeId])

  useEffect(() => {
    const delta = Math.abs(scrollProgress - previousScrollProgressRef.current)
    if (delta > 0.0005) {
      scrollActivityRef.current = 1
    }

    previousScrollProgressRef.current = scrollProgress
    scrollProgressRef.current = scrollProgress
  }, [scrollProgress])

  useEffect(() => {
    const activeNodeId = hoveredNodeId ?? selectedNodeId
    const states = stateAttribute.array as Float32Array

    if (activeNodeId === null) {
      states.fill(1)
    } else {
      states.fill(0.1)
      states[activeNodeId] = 1

      for (const neighborId of data.adjacency[activeNodeId]) {
        states[neighborId] = 0.7
      }
    }

    stateAttribute.needsUpdate = true
    invalidate()
  }, [
    data.adjacency,
    hoveredNodeId,
    invalidate,
    selectedNodeId,
    stateAttribute,
  ])

  useEffect(() => {
    if (selectedNodeId === null) {
      onSelectionChange(null)
      onTooltipPositionChange(null)
      tooltipPositionRef.current = null
      return
    }

    onSelectionChange(data.nodes[selectedNodeId])
  }, [data.nodes, onSelectionChange, onTooltipPositionChange, selectedNodeId])

  useEffect(() => {
    setHoveredNodeId(null)
    setSelectedNodeId(null)
    onSelectionChange(null)
    onTooltipPositionChange(null)
    tooltipPositionRef.current = null
    focusTargetRef.current = {
      controlsTarget: defaultTargetPosition.clone(),
      cameraPosition: defaultCameraPosition.clone(),
    }
  }, [
    defaultCameraPosition,
    defaultTargetPosition,
    onSelectionChange,
    onTooltipPositionChange,
    resetSignal,
  ])

  const focusNode = useCallback(
    (nodeId: number) => {
      const position = animatedNodePositions[nodeId]
      const direction = position.clone().normalize()
      if (direction.lengthSq() === 0) {
        direction.set(0, 0, 1)
      }

      focusTargetRef.current = {
        controlsTarget: position.clone(),
        cameraPosition: position.clone().add(direction.multiplyScalar(10)),
      }

      setSelectedNodeId(nodeId)
      invalidate()
    },
    [animatedNodePositions, invalidate]
  )

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (typeof event.instanceId !== "number") {
      return
    }

    event.stopPropagation()
    setHoveredNodeId(event.instanceId)
  }, [])

  const handlePointerOut = useCallback(() => {
    setHoveredNodeId(null)
  }, [])

  const handlePointerDown = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (typeof event.instanceId !== "number") {
        return
      }

      event.stopPropagation()
      focusNode(event.instanceId)
    },
    [focusNode]
  )

  useFrame((state, delta) => {
    frameCounterRef.current += 1
    const controls = controlsRef.current

    if (!controls) {
      return
    }

    const activeFocus = focusTargetRef.current
    if (activeFocus) {
      controls.target.lerp(activeFocus.controlsTarget, 0.08)
      camera.position.lerp(activeFocus.cameraPosition, 0.08)

      if (
        controls.target.distanceTo(activeFocus.controlsTarget) < 0.02 &&
        camera.position.distanceTo(activeFocus.cameraPosition) < 0.02
      ) {
        focusTargetRef.current = null
      }
    } else if (selectedNodeIdRef.current === null) {
      const zoomOutProgress = THREE.MathUtils.smootherstep(scrollProgressRef.current, 0.62, 0.84)

      targetTransitionVector.lerpVectors(
        defaultTargetPosition,
        zoomOutTargetPosition,
        zoomOutProgress
      )
      cameraTransitionVector.lerpVectors(
        defaultCameraPosition,
        zoomOutCameraPosition,
        zoomOutProgress
      )

      controls.target.lerp(targetTransitionVector, 0.08)
      camera.position.lerp(cameraTransitionVector, 0.08)
    }

    scrollActivityRef.current = Math.max(scrollActivityRef.current - 0.035, 0)
    controls.autoRotate = false
    controls.update()

    const cameraDistance = camera.position.distanceTo(controls.target)

    const shouldUpdateEveryFrame =
      scrollActivityRef.current > 0.04 || selectedNodeIdRef.current === null
    const nodeUpdateInterval = shouldUpdateEveryFrame ? 1 : 2

    if (frameCounterRef.current % nodeUpdateInterval === 0) {
      updateNodeMatrices(cameraDistance, state.clock.elapsedTime, delta)
    }

    if (selectedNodeIdRef.current !== null) {
      projectedVector
        .copy(animatedNodePositions[selectedNodeIdRef.current])
        .project(camera)

      const nextPosition = {
        x: (projectedVector.x * 0.5 + 0.5) * size.width,
        y: (-projectedVector.y * 0.5 + 0.5) * size.height,
      }

      const previousPosition = tooltipPositionRef.current
      if (
        !previousPosition ||
        Math.abs(previousPosition.x - nextPosition.x) > 1 ||
        Math.abs(previousPosition.y - nextPosition.y) > 1
      ) {
        tooltipPositionRef.current = nextPosition
        onTooltipPositionChange(nextPosition)
      }
    }
  })

  return (
    <>
      <fog attach="fog" args={["#0D0D0E", 48, 118]} />
      <ambientLight intensity={0.18} />
      <hemisphereLight color="#ffb2fb" groundColor="#130610" intensity={0.22} />
      <pointLight color="#FC72FF" intensity={260} decay={2} distance={150} position={[0, 8, 28]} />
      <pointLight color="#ff9df3" intensity={150} decay={2} distance={112} position={[-22, -18, -18]} />
      <pointLight color="#ffc2f7" intensity={100} decay={2} distance={98} position={[18, 16, -12]} />

      <instancedMesh
        ref={nodesRef}
        args={[nodeGeometry, nodeMaterial, data.nodes.length]}
        onClick={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      />

      <OrbitControls
        ref={controlsRef}
        dampingFactor={0.06}
        enableDamping
        enablePan={false}
        enableRotate={false}
        enableZoom={false}
        maxDistance={120}
        minDistance={14}
        target={[0, 0, 0]}
      />

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={1.05}
          kernelSize={2}
          luminanceSmoothing={0.42}
          luminanceThreshold={0.08}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}

export default function NetworkGraph(props: NetworkGraphProps) {
  const data = useMemo(() => generateMockData(), [])
  const [resetSignal, setResetSignal] = useState(0)

  return (
    <Canvas
      camera={{ fov: 42, near: 0.1, far: 240, position: [0, 2, 72] }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onPointerMissed={() => {
        setResetSignal((current) => current + 1)
        props.onSelectionChange(null)
        props.onTooltipPositionChange(null)
      }}
      shadows={false}
    >
      <color attach="background" args={["#0D0D0E"]} />
      <NetworkScene
        data={data}
        resetSignal={props.exploreSignal + resetSignal}
        onSelectionChange={props.onSelectionChange}
        onTooltipPositionChange={props.onTooltipPositionChange}
        scrollProgress={props.scrollProgress}
      />
    </Canvas>
  )
}
