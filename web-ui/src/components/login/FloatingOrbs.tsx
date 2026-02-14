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
  opacity: number
}

const ORB_COUNT = 16

const COLORS = [
  '#FF6B4A', '#FF8F6B', '#FFB088', '#FFCDA8',
  '#4A9FFF', '#6BB5FF', '#8ECAFF',
  '#FF7E5F', '#FFA07A', '#FF6347',
]

export default function FloatingOrbs() {
  const groupRef = useRef<THREE.Group>(null)

  const orbs = useMemo<OrbData[]>(() => {
    return Array.from({ length: ORB_COUNT }, (_, i) => {
      const angle = (i / ORB_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
      const radius = 1.5 + Math.random() * 5
      const x = Math.cos(angle) * radius
      const y = (Math.random() - 0.5) * 6
      const z = (Math.random() - 0.5) * 3 - 1

      // Vary sizes — some large blurry ones, some small bright ones
      const isLarge = i < 5
      const scale = isLarge ? 0.5 + Math.random() * 0.8 : 0.12 + Math.random() * 0.25
      const opacity = isLarge ? 0.12 + Math.random() * 0.1 : 0.25 + Math.random() * 0.2

      return {
        position: new THREE.Vector3(x, y, z),
        basePosition: new THREE.Vector3(x, y, z),
        scale,
        color: new THREE.Color(COLORS[i % COLORS.length]),
        speed: 0.15 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        orbitRadius: 0.4 + Math.random() * 0.8,
        opacity,
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
      child.position.y = orb.basePosition.y + Math.cos(t * orb.speed * 0.7 + orb.phase) * orb.orbitRadius * 0.9
      child.position.z = orb.basePosition.z + Math.sin(t * orb.speed * 0.5 + orb.phase * 2) * orb.orbitRadius * 0.5

      // Gentle scale breathing
      const breathe = 1 + Math.sin(t * orb.speed * 0.5 + orb.phase) * 0.15
      child.scale.setScalar(orb.scale * breathe)
    })
  })

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <mesh key={i} position={orb.position}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color={orb.color}
            transparent
            opacity={orb.opacity}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}
