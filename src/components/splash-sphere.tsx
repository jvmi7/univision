import { Canvas, useFrame } from "@react-three/fiber"
import { useRef } from "react"
import type { Mesh } from "three"

function AnimatedSphere() {
  const sphereRef = useRef<Mesh>(null)
  const wireframeRef = useRef<Mesh>(null)

  useFrame((state, delta) => {
    if (!sphereRef.current || !wireframeRef.current) {
      return
    }

    const y = Math.sin(state.clock.elapsedTime * 0.9) * 0.12

    sphereRef.current.rotation.y += delta * 0.35
    sphereRef.current.rotation.x += delta * 0.15
    sphereRef.current.position.y = y

    wireframeRef.current.rotation.copy(sphereRef.current.rotation)
    wireframeRef.current.position.y = y
  })

  return (
    <>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[1.15, 64, 64]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#4c1d95"
          emissiveIntensity={0.35}
          metalness={0.45}
          roughness={0.24}
        />
      </mesh>
      <mesh ref={wireframeRef} scale={1.18}>
        <sphereGeometry args={[1.15, 32, 32]} />
        <meshBasicMaterial
          color="#f5d0fe"
          opacity={0.18}
          transparent
          wireframe
        />
      </mesh>
    </>
  )
}

export function SplashSphere() {
  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ fov: 46, position: [0, 0, 4.2] }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight color="#ffffff" intensity={2.3} position={[2.5, 2, 3]} />
        <pointLight color="#7c3aed" intensity={18} position={[-3, -2, 2]} />
        <AnimatedSphere />
      </Canvas>
    </div>
  )
}
