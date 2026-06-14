'use client';
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Ring() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    // Gentle tilt & slow spin — stays clearly ring-shaped
    ref.current.rotation.x = 0.5 + Math.sin(state.clock.elapsedTime * 0.35) * 0.12;
    ref.current.rotation.y += 0.006;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.06;
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.72, 0.1, 24, 80]} />
      <meshStandardMaterial
        color="#d4af37"
        metalness={0.96}
        roughness={0.1}
        envMapIntensity={1.4}
      />
    </mesh>
  );
}

export default function FloatingRing({ size = 72 }: { size?: number }) {
  return (
    <Canvas
      style={{ width: size, height: size, display: 'inline-block', flexShrink: 0 }}
      camera={{ position: [0, 0, 2.6], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 3, 3]} intensity={2} color="#fff8e7" />
      <pointLight position={[-2, -2, 2]} intensity={0.8} color="#d4af37" />
      <Ring />
    </Canvas>
  );
}
