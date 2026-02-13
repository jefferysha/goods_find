import { Canvas } from '@react-three/fiber'
import GradientWaveMesh from './GradientWaveMesh'
import FloatingOrbs from './FloatingOrbs'
import DataGridLines from './DataGridLines'

export default function CyberScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
      }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.setClearColor('#f8f6f3')
      }}
    >
      <fog attach="fog" args={['#f8f6f3', 10, 30]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 5, 5]} intensity={0.4} color="#FFB088" />
      <GradientWaveMesh />
      <FloatingOrbs />
      <DataGridLines />
    </Canvas>
  )
}
