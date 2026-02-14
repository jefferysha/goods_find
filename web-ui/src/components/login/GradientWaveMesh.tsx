import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const SEGMENTS = 96
const SIZE = 24

export default function GradientWaveMesh() {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const { geometry, uniforms } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS)

    const u = {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color('#FF5A38') },
      uColorB: { value: new THREE.Color('#FF8F6B') },
      uColorC: { value: new THREE.Color('#4A9FFF') },
      uColorD: { value: new THREE.Color('#FFD4A8') },
    }

    return { geometry: geo, uniforms: u }
  }, [])

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime()
    }
  })

  const vertexShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      vUv = uv;

      vec3 pos = position;

      // Stronger, more dramatic waves
      float wave1 = sin(pos.x * 0.35 + uTime * 0.4) * cos(pos.y * 0.25 + uTime * 0.25) * 1.4;
      float wave2 = sin(pos.x * 0.7 + uTime * 0.55 + 1.5) * cos(pos.y * 0.5 + uTime * 0.4) * 0.7;
      float wave3 = sin(pos.x * 1.0 + pos.y * 0.7 + uTime * 0.3) * 0.35;
      float wave4 = cos(pos.x * 0.5 - pos.y * 0.4 + uTime * 0.2) * 0.5;

      pos.z = wave1 + wave2 + wave3 + wave4;
      vElevation = pos.z;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `

  const fragmentShader = `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorC;
    uniform vec3 uColorD;
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      // Animated color mixing based on UV, elevation, and time
      float t = uTime * 0.08;
      float mixX = vUv.x + sin(t + vUv.y * 2.0) * 0.15;
      float mixY = vUv.y + cos(t * 0.7 + vUv.x * 1.5) * 0.1;
      float mixFactor = mixX * 0.6 + mixY * 0.4 + vElevation * 0.15;
      mixFactor = clamp(mixFactor, 0.0, 1.0);

      vec3 color;
      if (mixFactor < 0.33) {
        color = mix(uColorA, uColorB, mixFactor * 3.0);
      } else if (mixFactor < 0.66) {
        color = mix(uColorB, uColorD, (mixFactor - 0.33) * 3.0);
      } else {
        color = mix(uColorD, uColorC, (mixFactor - 0.66) * 3.0);
      }

      // Brightness variation based on elevation — warm highlights on peaks
      float brightness = 0.9 + vElevation * 0.12;
      color *= brightness;

      // Soft edge fade
      float edgeFade = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x)
                      * smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);

      gl_FragColor = vec4(color, 0.75 * edgeFade);
    }
  `

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[-Math.PI * 0.38, 0, 0.05]}
      position={[0, -2.5, -3]}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}
