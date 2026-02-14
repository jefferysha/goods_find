import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Flowing light trails — warm-toned streaks that drift slowly across the scene,
 * giving a sense of data flowing through the background.
 */

const TRAIL_COUNT = 20
const GRID_SIZE = 14

export default function DataGridLines() {
  const linesRef = useRef<THREE.LineSegments>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const { positions, basePositions, speeds, phases, lengths } = useMemo(() => {
    const pos = new Float32Array(TRAIL_COUNT * 6)
    const basePos = new Float32Array(TRAIL_COUNT * 6)
    const spd = new Float32Array(TRAIL_COUNT)
    const phs = new Float32Array(TRAIL_COUNT)
    const len = new Float32Array(TRAIL_COUNT)

    for (let i = 0; i < TRAIL_COUNT; i++) {
      const i6 = i * 6
      const isHorizontal = i % 3 !== 0 // ~2/3 horizontal

      const length = 1.5 + Math.random() * 4
      len[i] = length

      if (isHorizontal) {
        const y = (Math.random() - 0.5) * GRID_SIZE
        const z = (Math.random() - 0.5) * 3 - 2
        const startX = (Math.random() - 0.5) * GRID_SIZE

        pos[i6] = startX
        pos[i6 + 1] = y
        pos[i6 + 2] = z
        pos[i6 + 3] = startX + length
        pos[i6 + 4] = y
        pos[i6 + 5] = z
      } else {
        const x = (Math.random() - 0.5) * GRID_SIZE
        const z = (Math.random() - 0.5) * 3 - 2
        const startY = (Math.random() - 0.5) * GRID_SIZE

        pos[i6] = x
        pos[i6 + 1] = startY
        pos[i6 + 2] = z
        pos[i6 + 3] = x
        pos[i6 + 4] = startY + length
        pos[i6 + 5] = z
      }

      for (let j = 0; j < 6; j++) {
        basePos[i6 + j] = pos[i6 + j]
      }

      spd[i] = 0.15 + Math.random() * 0.4
      phs[i] = Math.random() * Math.PI * 2
    }

    return { positions: pos, basePositions: basePos, speeds: spd, phases: phs, lengths: len }
  }, [])

  useFrame(({ clock }) => {
    if (!linesRef.current || !materialRef.current) return
    const t = clock.getElapsedTime()
    const posAttr = linesRef.current.geometry.attributes.position as THREE.BufferAttribute
    const posArray = posAttr.array as Float32Array

    for (let i = 0; i < TRAIL_COUNT; i++) {
      const i6 = i * 6
      const drift = Math.sin(t * speeds[i] + phases[i]) * 0.5
      const sway = Math.cos(t * speeds[i] * 0.6 + phases[i] * 1.5) * 0.3

      posArray[i6] = basePositions[i6] + drift
      posArray[i6 + 1] = basePositions[i6 + 1] + sway
      posArray[i6 + 3] = basePositions[i6 + 3] + drift
      posArray[i6 + 4] = basePositions[i6 + 4] + sway
    }

    posAttr.needsUpdate = true

    // Pulsing opacity
    materialRef.current.opacity = 0.12 + Math.sin(t * 0.3) * 0.04
  })

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial
        ref={materialRef}
        color="#FF8F6B"
        transparent
        opacity={0.14}
        depthWrite={false}
        linewidth={1}
      />
    </lineSegments>
  )
}
