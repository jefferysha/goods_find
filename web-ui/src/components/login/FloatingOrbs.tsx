import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface OrbData {
  position: THREE.Vector3
  basePosition: THREE.Vector3
  scale: number
  color: THREE.Color
  speed: number
  phase: number
  orbitRadius: number
}

const ORB_COUNT = 12

const COLORS = [
  '#FF6B4A', '#FF8F6B', '#FFB088',
  '#4A9FFF', '#6BB5FF', '#8ECAFF',
  '#FF7E5F', '#4AAFFF', '#FFa06B',
]

export default function FloatingOrbs() {
  const groupRef = useRef<THREE.Group>(null)

  const orbs = useMemo<OrbData[]>(() => {
    return Array.from({ length: ORB_COUNT }, (_, i) => {
      const angle = (i / ORB_COUNT) * Math.PI * 2
      const radius = 2 + Math.random() * 4
      const x = Math.cos(angle) * radius
      const y = (Math.random() - 0.5) * 5
      const z = (Math.random() - 0.5) * 4 - 2

      return {
        position: new THREE.Vector3(x, y, z),
        basePosition: new THREE.Vector3(x, y, z),
        scale: 0.15 + Math.random() * 0.4,
        color: new THREE.Color(COLORS[i % COLORS.length]),
        speed: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        orbitRadius: 0.3 + Math.random() * 0.6,
      }
    })
  }, [])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()

    groupRef.current.children.forEach((child, i) => {
      const orb = orbs[i]
      if (!orb) return

      // Gentle floating motion
      child.position.x = orb.basePosition.x + Math.sin(t * orb.speed + orb.phase) * orb.orbitRadius
      child.position.y = orb.basePosition.y + Math.cos(t * orb.speed * 0.7 + orb.phase) * orb.orbitRadius * 0.8
      child.position.z = orb.basePosition.z + Math.sin(t * orb.speed * 0.5 + orb.phase * 2) * orb.orbitRadius * 0.4

      // Gentle scale breathing
      const breathe = 1 + Math.sin(t * orb.speed * 0.6 + orb.phase) * 0.1
      child.scale.setScalar(orb.scale * breathe)
    })
  })

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <mesh key={i} position={orb.position}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial
            color={orb.color}
            transparent
            opacity={0.2}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}
