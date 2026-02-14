import { Canvas } from '@react-three/fiber'
import GradientWaveMesh from './GradientWaveMesh'
import FloatingOrbs from './FloatingOrbs'
import DataGridLines from './DataGridLines'

export default function CyberScene() {
  return (
    <Canvas
      camera={{ position: [0, 1, 9], fov: 55 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
      }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]} // 限制像素比，移动端节省性能
      onCreated={({ gl }) => {
        gl.setClearColor('#f8f6f3')
      }}
    >
      <fog attach="fog" args={['#f8f6f3', 12, 35]} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} color="#FFB088" />
      <directionalLight position={[-3, 2, 4]} intensity={0.3} color="#4A9FFF" />
      <GradientWaveMesh />
      <FloatingOrbs />
      <DataGridLines />
    </Canvas>
  )
}
