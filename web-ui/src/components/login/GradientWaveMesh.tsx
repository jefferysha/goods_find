import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const SEGMENTS = 80
const SIZE = 20

export default function GradientWaveMesh() {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const { geometry, uniforms } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS)

    const u = {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color('#FF6B4A') },
      uColorB: { value: new THREE.Color('#FF8F6B') },
      uColorC: { value: new THREE.Color('#4A9FFF') },
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

      // Multiple wave layers for organic movement
      float wave1 = sin(pos.x * 0.4 + uTime * 0.3) * cos(pos.y * 0.3 + uTime * 0.2) * 0.8;
      float wave2 = sin(pos.x * 0.8 + uTime * 0.5 + 1.5) * cos(pos.y * 0.6 + uTime * 0.35) * 0.4;
      float wave3 = sin(pos.x * 1.2 + pos.y * 0.8 + uTime * 0.25) * 0.2;

      pos.z = wave1 + wave2 + wave3;
      vElevation = pos.z;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `

  const fragmentShader = `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorC;
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      // Mix colors based on UV position and elevation
      float mixFactor = vUv.x + vElevation * 0.3 + sin(uTime * 0.1) * 0.1;
      mixFactor = clamp(mixFactor, 0.0, 1.0);

      vec3 color;
      if (mixFactor < 0.5) {
        color = mix(uColorA, uColorB, mixFactor * 2.0);
      } else {
        color = mix(uColorB, uColorC, (mixFactor - 0.5) * 2.0);
      }

      // Add subtle brightness variation based on elevation
      float brightness = 0.85 + vElevation * 0.1;
      color *= brightness;

      // Soft edge fade
      float edgeFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x)
                      * smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);

      gl_FragColor = vec4(color, 0.6 * edgeFade);
    }
  `

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[-Math.PI * 0.4, 0, 0]}
      position={[0, -3, -2]}
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
