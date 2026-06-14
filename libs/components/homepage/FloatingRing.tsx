'use client';
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Ring() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.3;
    ref.current.rotation.y += 0.008;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.15;
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[1.1, 0.18, 32, 80]} />
      <meshStandardMaterial
        color="#d4af37"
        metalness={0.92}
        roughness={0.12}
        envMapIntensity={1.2}
      />
    </mesh>
  );
}

export default function FloatingRing({ size = 120 }: { size?: number }) {
  return (
    <Canvas
      style={{ width: size, height: size, display: 'inline-block' }}
      camera={{ position: [0, 0, 3.5], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 3, 3]} intensity={1.8} color="#fff8e7" />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color="#d4af37" />
      <Ring />
    </Canvas>
  );
}
