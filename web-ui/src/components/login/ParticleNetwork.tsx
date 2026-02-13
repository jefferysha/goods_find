import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 200
const BOUNDS = 8
const CONNECTION_DISTANCE = 2.5
const MOUSE_INFLUENCE_RADIUS = 3
const MOUSE_INFLUENCE_STRENGTH = 0.02

export default function ParticleNetwork() {
  const pointsRef = useRef<THREE.Points>(null)
  const linesRef = useRef<THREE.LineSegments>(null)
  const mouseRef = useRef(new THREE.Vector3(0, 0, 0))
  const { viewport } = useThree()

  // Initialize particle positions and velocities
  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const vel = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      pos[i3] = (Math.random() - 0.5) * BOUNDS * 2
      pos[i3 + 1] = (Math.random() - 0.5) * BOUNDS * 2
      pos[i3 + 2] = (Math.random() - 0.5) * BOUNDS
      vel[i3] = (Math.random() - 0.5) * 0.01
      vel[i3 + 1] = (Math.random() - 0.5) * 0.01
      vel[i3 + 2] = (Math.random() - 0.5) * 0.005
    }
    return { positions: pos, velocities: vel }
  }, [])

  // Pre-allocate line geometry buffer (max possible connections)
  const maxLines = PARTICLE_COUNT * 20
  const linePositions = useMemo(() => new Float32Array(maxLines * 6), [maxLines])
  const lineColors = useMemo(() => new Float32Array(maxLines * 8), [maxLines])

  // Track mouse position via pointer events on the canvas
  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1
      const y = -(event.clientY / window.innerHeight) * 2 + 1
      mouseRef.current.set(
        x * viewport.width * 0.5,
        y * viewport.height * 0.5,
        0
      )
    }
    window.addEventListener('pointermove', handlePointerMove)
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [viewport])

  useFrame(() => {
    if (!pointsRef.current || !linesRef.current) return

    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const posArray = posAttr.array as Float32Array
    const mouse = mouseRef.current

    // Update particle positions
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3

      // Apply velocity
      posArray[i3] += velocities[i3]
      posArray[i3 + 1] += velocities[i3 + 1]
      posArray[i3 + 2] += velocities[i3 + 2]

      // Mouse influence
      const dx = mouse.x - posArray[i3]
      const dy = mouse.y - posArray[i3 + 1]
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < MOUSE_INFLUENCE_RADIUS && dist > 0.1) {
        posArray[i3] += (dx / dist) * MOUSE_INFLUENCE_STRENGTH
        posArray[i3 + 1] += (dy / dist) * MOUSE_INFLUENCE_STRENGTH
      }

      // Boundary bounce
      for (let axis = 0; axis < 3; axis++) {
        const bound = axis === 2 ? BOUNDS * 0.5 : BOUNDS
        if (posArray[i3 + axis] > bound) {
          posArray[i3 + axis] = bound
          velocities[i3 + axis] *= -1
        } else if (posArray[i3 + axis] < -bound) {
          posArray[i3 + axis] = -bound
          velocities[i3 + axis] *= -1
        }
      }
    }
    posAttr.needsUpdate = true

    // Build connection lines
    const lineGeo = linesRef.current.geometry
    const linePosAttr = lineGeo.attributes.position as THREE.BufferAttribute
    const linePosArray = linePosAttr.array as Float32Array
    const lineColAttr = lineGeo.attributes.color as THREE.BufferAttribute
    const lineColArray = lineColAttr.array as Float32Array

    let lineIndex = 0
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const i3 = i * 3
        const j3 = j * 3
        const ddx = posArray[i3] - posArray[j3]
        const ddy = posArray[i3 + 1] - posArray[j3 + 1]
        const ddz = posArray[i3 + 2] - posArray[j3 + 2]
        const d = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz)

        if (d < CONNECTION_DISTANCE && lineIndex < maxLines) {
          const idx = lineIndex * 6
          linePosArray[idx] = posArray[i3]
          linePosArray[idx + 1] = posArray[i3 + 1]
          linePosArray[idx + 2] = posArray[i3 + 2]
          linePosArray[idx + 3] = posArray[j3]
          linePosArray[idx + 4] = posArray[j3 + 1]
          linePosArray[idx + 5] = posArray[j3 + 2]

          const alpha = 1 - d / CONNECTION_DISTANCE
          const cIdx = lineIndex * 8
          // Cyan color: rgb(0, 1, 0.96) with fading alpha
          lineColArray[cIdx] = 0
          lineColArray[cIdx + 1] = 1
          lineColArray[cIdx + 2] = 0.96
          lineColArray[cIdx + 3] = alpha * 0.15
          lineColArray[cIdx + 4] = 0
          lineColArray[cIdx + 5] = 1
          lineColArray[cIdx + 6] = 0.96
          lineColArray[cIdx + 7] = alpha * 0.15

          lineIndex++
        }
      }
    }

    // Zero out remaining lines
    for (let i = lineIndex * 6; i < linePosArray.length; i++) {
      linePosArray[i] = 0
    }
    for (let i = lineIndex * 8; i < lineColArray.length; i++) {
      lineColArray[i] = 0
    }

    linePosAttr.needsUpdate = true
    lineColAttr.needsUpdate = true
    lineGeo.setDrawRange(0, lineIndex * 2)
  })

  return (
    <group>
      {/* Particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color="#00fff5"
          transparent
          opacity={0.8}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Connection lines */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[lineColors, 4]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  )
}
