import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const LINE_COUNT = 30
const GRID_SIZE = 12

export default function DataGridLines() {
  const linesRef = useRef<THREE.LineSegments>(null)

  const { positions, basePositions, speeds } = useMemo(() => {
    const pos = new Float32Array(LINE_COUNT * 6)
    const basePos = new Float32Array(LINE_COUNT * 6)
    const spd = new Float32Array(LINE_COUNT)

    for (let i = 0; i < LINE_COUNT; i++) {
      const i6 = i * 6
      const isHorizontal = Math.random() > 0.5

      if (isHorizontal) {
        const y = (Math.random() - 0.5) * GRID_SIZE
        const z = (Math.random() - 0.5) * 4 - 3
        const length = 1 + Math.random() * 4

        pos[i6] = (Math.random() - 0.5) * GRID_SIZE
        pos[i6 + 1] = y
        pos[i6 + 2] = z
        pos[i6 + 3] = pos[i6] + length
        pos[i6 + 4] = y
        pos[i6 + 5] = z
      } else {
        const x = (Math.random() - 0.5) * GRID_SIZE
        const z = (Math.random() - 0.5) * 4 - 3
        const length = 1 + Math.random() * 3

        pos[i6] = x
        pos[i6 + 1] = (Math.random() - 0.5) * GRID_SIZE
        pos[i6 + 2] = z
        pos[i6 + 3] = x
        pos[i6 + 4] = pos[i6 + 1] + length
        pos[i6 + 5] = z
      }

      // Copy to base positions
      for (let j = 0; j < 6; j++) {
        basePos[i6 + j] = pos[i6 + j]
      }

      spd[i] = 0.1 + Math.random() * 0.3
    }

    return { positions: pos, basePositions: basePos, speeds: spd }
  }, [])

  useFrame(({ clock }) => {
    if (!linesRef.current) return
    const t = clock.getElapsedTime()
    const posAttr = linesRef.current.geometry.attributes.position as THREE.BufferAttribute
    const posArray = posAttr.array as Float32Array

    for (let i = 0; i < LINE_COUNT; i++) {
      const i6 = i * 6
      const drift = Math.sin(t * speeds[i] + i) * 0.3

      // Gentle drifting motion
      posArray[i6] = basePositions[i6] + drift
      posArray[i6 + 1] = basePositions[i6 + 1] + Math.cos(t * speeds[i] * 0.7 + i * 2) * 0.2
      posArray[i6 + 3] = basePositions[i6 + 3] + drift
      posArray[i6 + 4] = basePositions[i6 + 4] + Math.cos(t * speeds[i] * 0.7 + i * 2) * 0.2
    }

    posAttr.needsUpdate = true
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
        color="#4A9FFF"
        transparent
        opacity={0.08}
        depthWrite={false}
      />
    </lineSegments>
  )
}
