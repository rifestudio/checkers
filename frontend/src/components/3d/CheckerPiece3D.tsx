import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

interface CheckerPieceProps {
  color?: string
  position?: [number, number, number]
  scale?: number
  isKing?: boolean
}

export function CheckerPiece3D({ 
  color = "#f97316", 
  position = [0, 0, 0],
  scale = 1,
  isKing = false
}: CheckerPieceProps) {
  const meshRef = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  const geometry = useMemo(() => {
    // Create a checker piece shape using lathe geometry
    const points = []

    // Bottom flat
    points.push(new THREE.Vector2(0, 0))
    points.push(new THREE.Vector2(0.7, 0))

    // Bottom edge curve
    points.push(new THREE.Vector2(0.75, 0.02))
    points.push(new THREE.Vector2(0.78, 0.05))

    // Lower body
    points.push(new THREE.Vector2(0.8, 0.15))
    points.push(new THREE.Vector2(0.82, 0.25))

    // Middle groove
    points.push(new THREE.Vector2(0.78, 0.3))
    points.push(new THREE.Vector2(0.75, 0.32))

    // Upper body
    points.push(new THREE.Vector2(0.8, 0.35))
    points.push(new THREE.Vector2(0.82, 0.45))

    // Top edge
    points.push(new THREE.Vector2(0.8, 0.52))
    points.push(new THREE.Vector2(0.75, 0.55))

    // Top flat
    points.push(new THREE.Vector2(0.6, 0.55))
    points.push(new THREE.Vector2(0, 0.55))

    return new THREE.LatheGeometry(points, 64)
  }, [])

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime()
      // Floating animation
      meshRef.current.position.y = position[1] + Math.sin(t * 0.8) * 0.08
      // Gentle rotation
      meshRef.current.rotation.y = t * 0.15
      // Subtle tilt
      meshRef.current.rotation.x = Math.sin(t * 0.5) * 0.03
    }

    if (glowRef.current) {
      const t = state.clock.getElapsedTime()
      const material = glowRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.15 + Math.sin(t * 1.2) * 0.05
    }
  })

  return (
    <group ref={meshRef} position={position} scale={scale}>
      {/* Main piece */}
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={color}
          metalness={0.6}
          roughness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.1}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* Glow ring */}
      <mesh ref={glowRef} position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.85, 1.05, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Crown for king */}
      {isKing && (
        <group position={[0, 0.55, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.25, 0.3, 0.15, 16]} />
            <meshPhysicalMaterial
              color="#fbbf24"
              metalness={0.9}
              roughness={0.1}
              emissive="#f59e0b"
              emissiveIntensity={0.2}
            />
          </mesh>
          {/* Crown spikes */}
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh
              key={i}
              position={[
                Math.cos((i * Math.PI * 2) / 5) * 0.2,
                0.12,
                Math.sin((i * Math.PI * 2) / 5) * 0.2,
              ]}
              castShadow
            >
              <coneGeometry args={[0.04, 0.12, 8]} />
              <meshPhysicalMaterial
                color="#fbbf24"
                metalness={0.9}
                roughness={0.1}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}
