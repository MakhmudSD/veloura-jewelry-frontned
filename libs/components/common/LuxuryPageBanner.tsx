'use client';
import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ── Slowly rotating central gem ── */
function Gem() {
	const ref = useRef<THREE.Mesh>(null);
	useFrame((state) => {
		if (!ref.current) return;
		ref.current.rotation.y = state.clock.elapsedTime * 0.25;
		ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.18) * 0.25;
		ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.08;
	});
	return (
		<mesh ref={ref}>
			<octahedronGeometry args={[0.7, 1]} />
			<meshStandardMaterial
				color="#d4af37"
				metalness={0.95}
				roughness={0.08}
				envMapIntensity={1.5}
			/>
		</mesh>
	);
}

/* ── Outer wireframe ring ── */
function WireRing() {
	const ref = useRef<THREE.Mesh>(null);
	useFrame((state) => {
		if (!ref.current) return;
		ref.current.rotation.z = state.clock.elapsedTime * 0.12;
		ref.current.rotation.x = 0.6;
	});
	return (
		<mesh ref={ref}>
			<torusGeometry args={[1.4, 0.018, 3, 90]} />
			<meshBasicMaterial color="#d4af37" opacity={0.35} transparent />
		</mesh>
	);
}

/* ── Drifting gold dust ── */
function Dust() {
	const COUNT = 60;
	const ref = useRef<THREE.Points>(null);

	const [positions, sizes] = useMemo(() => {
		const pos = new Float32Array(COUNT * 3);
		const sz = new Float32Array(COUNT);
		for (let i = 0; i < COUNT; i++) {
			const theta = Math.random() * Math.PI * 2;
			const r = 1.8 + Math.random() * 1.6;
			pos[i * 3]     = Math.cos(theta) * r;
			pos[i * 3 + 1] = (Math.random() - 0.5) * 1.8;
			pos[i * 3 + 2] = Math.sin(theta) * r;
			sz[i] = 0.03 + Math.random() * 0.05;
		}
		return [pos, sz];
	}, []);

	useFrame((state) => {
		if (!ref.current) return;
		ref.current.rotation.y = state.clock.elapsedTime * 0.06;
	});

	return (
		<points ref={ref}>
			<bufferGeometry>
				<bufferAttribute attach="attributes-position" args={[positions, 3]} />
				<bufferAttribute attach="attributes-size" args={[sizes, 1]} />
			</bufferGeometry>
			<pointsMaterial color="#f0d060" size={0.04} transparent opacity={0.7} sizeAttenuation />
		</points>
	);
}

function Scene() {
	return (
		<>
			<ambientLight intensity={0.3} />
			<pointLight position={[4, 4, 4]} intensity={2.2} color="#fff8e7" />
			<pointLight position={[-4, -2, 3]} intensity={0.8} color="#d4af37" />
			<pointLight position={[0, -4, -2]} intensity={0.4} color="#b8860b" />
			<Gem />
			<WireRing />
			<Dust />
		</>
	);
}

interface LuxuryPageBannerProps {
	title: string;
	breadcrumb?: string;
}

export default function LuxuryPageBanner({ title, breadcrumb }: LuxuryPageBannerProps) {
	return (
		<div className="luxury-page-banner">
			{/* Three.js canvas fills the banner */}
			<div className="banner-canvas-wrap">
				<Suspense fallback={null}>
					<Canvas
						camera={{ position: [0, 0, 4.5], fov: 42 }}
						gl={{ antialias: true, alpha: false }}
						style={{ width: '100%', height: '100%' }}
					>
						<Scene />
					</Canvas>
				</Suspense>
			</div>

			{/* Gradient vignette over canvas */}
			<div className="banner-vignette" />

			{/* Text overlay */}
			<div className="banner-text">
				{breadcrumb && <span className="banner-breadcrumb">{breadcrumb}</span>}
				<h1 className="banner-title">{title}</h1>
				<div className="banner-gold-line" />
			</div>
		</div>
	);
}
