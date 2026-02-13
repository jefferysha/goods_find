import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const STREAM_COUNT = 60
const Y_TOP = 10
const Y_BOTTOM = -10

export default function DataStream() {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, speeds } = useMemo(() => {
    const pos = new Float32Array(STREAM_COUNT * 3)
    const spd = new Float32Array(STREAM_COUNT)
    for (let i = 0; i < STREAM_COUNT; i++) {
      const i3 = i * 3
      pos[i3] = (Math.random() - 0.5) * 16     // x spread
      pos[i3 + 1] = Math.random() * (Y_TOP - Y_BOTTOM) + Y_BOTTOM // y
      pos[i3 + 2] = (Math.random() - 0.5) * 6  // z spread
      spd[i] = 0.02 + Math.random() * 0.06      // varying fall speed
    }
    return { positions: pos, speeds: spd }
  }, [])

  useFrame(() => {
    if (!pointsRef.current) return

    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const posArray = posAttr.array as Float32Array

    for (let i = 0; i < STREAM_COUNT; i++) {
      const i3 = i * 3
      posArray[i3 + 1] -= speeds[i]

      // Reset to top when reaching bottom
      if (posArray[i3 + 1] < Y_BOTTOM) {
        posArray[i3 + 1] = Y_TOP
        posArray[i3] = (Math.random() - 0.5) * 16
        posArray[i3 + 2] = (Math.random() - 0.5) * 6
      }
    }

    posAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#ff00aa"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
