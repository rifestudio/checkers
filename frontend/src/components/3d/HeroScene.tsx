import { useRef, Suspense, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import * as THREE from "three";
import { CheckerPiece3D } from "./CheckerPiece3D";

function FloatingPieces() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      groupRef.current.rotation.y = t * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <CheckerPiece3D
        color="#f97316"
        position={[0, 0, 0]}
        scale={1.8}
        isKing={true}
      />

      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <CheckerPiece3D color="#1a1a1a" position={[2.5, 0.5, 1]} scale={0.6} />
      </Float>

      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.3}>
        <CheckerPiece3D
          color="#f97316"
          position={[-2, -0.3, -1.5]}
          scale={0.5}
        />
      </Float>

      <Float speed={2.5} rotationIntensity={0.7} floatIntensity={0.4}>
        <CheckerPiece3D color="#1a1a1a" position={[1.5, 0.8, -2]} scale={0.4} />
      </Float>

      <Float speed={1.8} rotationIntensity={0.4} floatIntensity={0.6}>
        <CheckerPiece3D
          color="#f97316"
          position={[-1.5, -0.5, 2]}
          scale={0.5}
        />
      </Float>
    </group>
  );
}

function Particles() {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 200;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 15;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 15;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      const t = state.clock.getElapsedTime();
      particlesRef.current.rotation.y = t * 0.02;
      particlesRef.current.rotation.x = t * 0.01;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#f97316"
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// Показывает тень только на десктопе
function FakeShadow() {
  const isMobile = window.innerWidth < 768;
  if (isMobile) return null;

  return (
    <mesh
      position={[0, -2.01, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-1}
    >
      <circleGeometry args={[3, 32]} />
      <meshBasicMaterial
        color="#f97316"
        transparent
        opacity={0.15}
        depthWrite={false}
      />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <spotLight
        position={[10, 10, 10]}
        angle={0.3}
        penumbra={1}
        intensity={2}
        color="#f97316"
      />
      <spotLight
        position={[-10, 5, -5]}
        angle={0.4}
        penumbra={1}
        intensity={1}
        color="#fb923c"
      />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#f97316" />

      <Suspense fallback={null}>
        <FloatingPieces />
        <Particles />
        <FakeShadow />
        <Environment preset="city" />
      </Suspense>
    </>
  );
}

export function HeroScene() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 2, 6], fov: 45 }}
        gl={{
          antialias: false,
          alpha: true,
          premultipliedAlpha: false,
          powerPreference: "high-performance",
          depth: true,
          stencil: false,
        }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
