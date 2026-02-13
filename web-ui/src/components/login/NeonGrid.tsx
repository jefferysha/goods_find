import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function NeonGrid() {
  const gridRef = useRef<THREE.Group>(null)
  const offsetRef = useRef(0)

  useFrame((_, delta) => {
    if (!gridRef.current) return
    // Slow forward scrolling animation
    offsetRef.current += delta * 0.3
    if (offsetRef.current > 2) offsetRef.current -= 2
    gridRef.current.position.z = offsetRef.current
  })

  return (
    <group
      position={[0, -5, 0]}
      rotation={[-Math.PI * 0.35, 0, 0]}
    >
      <group ref={gridRef}>
        {/* Main grid lines - magenta */}
        <gridHelper
          args={[40, 20, '#ff00aa', '#1a0033']}
        />
        {/* Secondary finer grid for depth */}
        <gridHelper
          args={[40, 80, '#1a0033', '#0d001a']}
          position={[0, -0.01, 0]}
        />
      </group>

      {/* Glow plane underneath */}
      <mesh
        rotation={[-Math.PI * 0.5, 0, 0]}
        position={[0, -0.05, 0]}
      >
        <planeGeometry args={[40, 40]} />
        <meshBasicMaterial
          color="#0a0010"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
