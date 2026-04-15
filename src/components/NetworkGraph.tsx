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
  NETWORK_EDGE_COLOR,
  NETWORK_EDGE_HIGHLIGHT_COLOR,
  NODE_COLORS,
} from "@/lib/constants"
import { generateMockData, type NetworkData, type NetworkNode } from "@/lib/generateMockData"

type NetworkGraphProps = {
  exploreSignal: number
  onSelectionChange: (node: NetworkNode | null) => void
  onTooltipPositionChange: (position: { x: number; y: number } | null) => void
  scrollProgress: number
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
  material.emissive = new THREE.Color("#ffb8f8")
  material.emissiveIntensity = 0.65

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
  const edgesRef = useRef<THREE.LineSegments>(null)
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
  const projectionMatrix = useMemo(() => new THREE.Matrix4(), [])
  const frustum = useMemo(() => new THREE.Frustum(), [])
  const projectedVector = useMemo(() => new THREE.Vector3(), [])
  const scrollCameraPosition = useMemo(() => new THREE.Vector3(), [])
  const scrollTargetPosition = useMemo(() => new THREE.Vector3(), [])
  const animatedNodePositions = useMemo(
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
    const geometry = new THREE.IcosahedronGeometry(1, 1)
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

  const edgeGeometry = useMemo(() => {
    const positions = new Float32Array(data.edges.length * 6)
    const colors = new Float32Array(data.edges.length * 6)

    data.edges.forEach((edge, edgeIndex) => {
      const source = data.nodes[edge.source]
      const target = data.nodes[edge.target]
      const sourcePosition = source.position
      const targetPosition = target.position
      const start = edgeIndex * 6

      positions[start] = sourcePosition[0]
      positions[start + 1] = sourcePosition[1]
      positions[start + 2] = sourcePosition[2]
      positions[start + 3] = targetPosition[0]
      positions[start + 4] = targetPosition[1]
      positions[start + 5] = targetPosition[2]

      const sourceColor = new THREE.Color(NETWORK_EDGE_COLOR).multiplyScalar(
        0.08 + (source.auraScore / 100) * 0.05
      )
      const targetColor = new THREE.Color(NETWORK_EDGE_COLOR).multiplyScalar(
        0.08 + (target.auraScore / 100) * 0.05
      )

      colors[start] = sourceColor.r
      colors[start + 1] = sourceColor.g
      colors[start + 2] = sourceColor.b
      colors[start + 3] = targetColor.r
      colors[start + 4] = targetColor.g
      colors[start + 5] = targetColor.b
    })

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))

    return geometry
  }, [data.edges, data.nodes])

  const baseEdgeColors = useMemo(
    () =>
      Float32Array.from(
        (
          edgeGeometry.getAttribute("color") as THREE.BufferAttribute
        ).array as ArrayLike<number>
      ),
    [edgeGeometry]
  )

  const highlightedEdgeColors = useMemo(() => {
    const colors = new Float32Array(baseEdgeColors.length)

    data.edges.forEach((_, edgeIndex) => {
      const sourceColor = new THREE.Color(NETWORK_EDGE_HIGHLIGHT_COLOR).multiplyScalar(0.55)
      const targetColor = new THREE.Color(NETWORK_EDGE_HIGHLIGHT_COLOR).multiplyScalar(0.55)
      const start = edgeIndex * 6

      colors[start] = sourceColor.r
      colors[start + 1] = sourceColor.g
      colors[start + 2] = sourceColor.b
      colors[start + 3] = targetColor.r
      colors[start + 4] = targetColor.g
      colors[start + 5] = targetColor.b
    })

    return colors
  }, [baseEdgeColors.length, data.edges, data.nodes])

  const edgeMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        transparent: true,
        opacity: 0.085,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  )

  const updateNodeMatrices = useCallback(
    (cameraDistance: number, activeFrustum: THREE.Frustum, elapsedTime: number) => {
      const instancedMesh = nodesRef.current
      if (!instancedMesh) {
        return
      }

      const isFar = cameraDistance > NETWORK_CONFIG.farDistance
      const isMedium =
        cameraDistance <= NETWORK_CONFIG.farDistance &&
        cameraDistance > NETWORK_CONFIG.nearDistance

      for (let index = 0; index < data.nodes.length; index += 1) {
        const basePosition = nodePositions[index]
        const animatedPosition = animatedNodePositions[index]
        const motion = motionSeeds[index]
        const wave = elapsedTime * motion.speed + motion.phase
        const offsetA = Math.sin(wave) * motion.amplitude
        const offsetB = Math.cos(wave * 0.7) * motion.amplitude * 0.55

        animatedPosition
          .copy(basePosition)
          .addScaledVector(motion.tangent, offsetA)
          .addScaledVector(motion.bitangent, offsetB)

        const position = animatedPosition
        const visible = activeFrustum.containsPoint(position)
        const baseScale = baseScales[index]
        const zoomScale = isFar ? 0.72 : isMedium ? 0.9 : 1.08
        const frustumBoost = isMedium && visible ? 1.08 : 1
        const selectedBoost = selectedNodeIdRef.current === index ? 1.75 : 1
        const pulse = 1 + Math.sin(wave * 1.4) * motion.pulseAmplitude
        const scale = baseScale * zoomScale * frustumBoost * selectedBoost * pulse

        tempObject.position.copy(position)
        tempObject.scale.setScalar(scale)
        tempObject.updateMatrix()
        instancedMesh.setMatrixAt(index, tempObject.matrix)
      }

      instancedMesh.instanceMatrix.needsUpdate = true

      const edgePositions = (
        edgeGeometry.getAttribute("position") as THREE.BufferAttribute
      ).array as Float32Array

      data.edges.forEach((edge, edgeIndex) => {
        const sourcePosition = animatedNodePositions[edge.source]
        const targetPosition = animatedNodePositions[edge.target]
        const start = edgeIndex * 6

        edgePositions[start] = sourcePosition.x
        edgePositions[start + 1] = sourcePosition.y
        edgePositions[start + 2] = sourcePosition.z
        edgePositions[start + 3] = targetPosition.x
        edgePositions[start + 4] = targetPosition.y
        edgePositions[start + 5] = targetPosition.z
      })

      edgeGeometry.getAttribute("position").needsUpdate = true
    },
    [
      animatedNodePositions,
      baseScales,
      data.edges,
      data.nodes.length,
      edgeGeometry,
      motionSeeds,
      nodePositions,
      tempObject,
    ]
  )

  useLayoutEffect(() => {
    const instancedMesh = nodesRef.current
    const lines = edgesRef.current
    if (!instancedMesh || !lines) {
      return
    }

    const colors = data.nodes.map((node) => {
      const color = new THREE.Color(NODE_COLORS[node.type])
      const auraTint = node.auraScore / 100
      return color.lerp(new THREE.Color("#ffe4fd"), auraTint * 0.45)
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

    lines.geometry.computeBoundingSphere()
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
    const edgeColors = (
      edgeGeometry.getAttribute("color") as THREE.BufferAttribute
    ).array as Float32Array

    if (activeNodeId === null) {
      states.fill(1)
      edgeColors.set(baseEdgeColors)
    } else {
      states.fill(0.1)
      states[activeNodeId] = 1

      for (const neighborId of data.adjacency[activeNodeId]) {
        states[neighborId] = 0.7
      }

      for (let edgeIndex = 0; edgeIndex < data.edges.length; edgeIndex += 1) {
        const edge = data.edges[edgeIndex]
        const start = edgeIndex * 6
        const isConnected =
          edge.source === activeNodeId || edge.target === activeNodeId

        if (isConnected) {
          edgeColors[start] = highlightedEdgeColors[start]
          edgeColors[start + 1] = highlightedEdgeColors[start + 1]
          edgeColors[start + 2] = highlightedEdgeColors[start + 2]
          edgeColors[start + 3] = highlightedEdgeColors[start + 3]
          edgeColors[start + 4] = highlightedEdgeColors[start + 4]
          edgeColors[start + 5] = highlightedEdgeColors[start + 5]
        } else {
          edgeColors[start] = 0.02
          edgeColors[start + 1] = 0.01
          edgeColors[start + 2] = 0.02
          edgeColors[start + 3] = 0.02
          edgeColors[start + 4] = 0.01
          edgeColors[start + 5] = 0.02
        }
      }
    }

    stateAttribute.needsUpdate = true
    edgeGeometry.getAttribute("color").needsUpdate = true
    invalidate()
  }, [
    baseEdgeColors,
    data.adjacency,
    data.edges,
    edgeGeometry,
    highlightedEdgeColors,
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
      controlsTarget: new THREE.Vector3(0, 0, 0),
      cameraPosition: new THREE.Vector3(0, 0, NETWORK_CONFIG.mediumDistance + 4),
    }
  }, [onSelectionChange, onTooltipPositionChange, resetSignal])

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

  useFrame((state) => {
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
      const progress = scrollProgressRef.current
      const travel = THREE.MathUtils.smootherstep(progress, 0, 1)
      const orbitAngle = THREE.MathUtils.lerp(-0.8, 0.95, travel)
      const orbitRadius = THREE.MathUtils.lerp(70, 34, travel)
      const arc = Math.sin(progress * Math.PI)

      scrollTargetPosition.set(
        THREE.MathUtils.lerp(-8, 10, travel),
        THREE.MathUtils.lerp(6, -8, travel) + arc * 3,
        THREE.MathUtils.lerp(8, -12, travel)
      )

      scrollCameraPosition.set(
        Math.sin(orbitAngle) * orbitRadius,
        THREE.MathUtils.lerp(14, -10, travel) + arc * 6,
        Math.cos(orbitAngle) * orbitRadius
      )

      controls.target.lerp(scrollTargetPosition, 0.08)
      camera.position.lerp(scrollCameraPosition, 0.08)
    }

    scrollActivityRef.current = Math.max(scrollActivityRef.current - 0.035, 0)
    controls.autoRotate =
      selectedNodeIdRef.current === null && scrollActivityRef.current < 0.1
    controls.update()

    const cameraDistance = camera.position.distanceTo(controls.target)
    projectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustum.setFromProjectionMatrix(projectionMatrix)

    if (frameCounterRef.current % 2 === 0) {
      updateNodeMatrices(cameraDistance, frustum, state.clock.elapsedTime)
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

      <lineSegments ref={edgesRef} geometry={edgeGeometry} material={edgeMaterial} />

      <instancedMesh
        ref={nodesRef}
        args={[nodeGeometry, nodeMaterial, data.nodes.length]}
        onClick={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      />

      <OrbitControls
        ref={controlsRef}
        autoRotate
        autoRotateSpeed={0.3}
        dampingFactor={0.06}
        enableDamping
        enablePan
        maxDistance={120}
        minDistance={14}
        rotateSpeed={0.42}
        target={[0, 0, 0]}
        zoomSpeed={0.8}
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
      camera={{ fov: 42, near: 0.1, far: 240, position: [0, 0, 64] }}
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
