'use client'

import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, OrbitControls, useGLTF } from '@react-three/drei'
import type { FurnitureItem } from '@/lib/designs'

// Same coordinate handling as the app's viewer (Room3DViewerRealOne):
//   room GLB is Z-up (from the point cloud)        -> rotate X by -90°
//   furniture positions are Z-up, in cm             -> /100, then [x, z, -y]
//   furniture rotations are Z-up                    -> [rx, rz + 180°, -ry]
export type PlacedItem = { id: string; url: string; position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number]; label?: string; highlight?: boolean }

export function toScene(item: FurnitureItem): PlacedItem {
  const p = item.position ?? [0, 0, 0]
  const r = item.rotation ?? [0, 0, 0]
  const s = item.scale ?? [1, 1, 1]
  return {
    id: item.id,
    url: item.url,
    position: [p[0] / 100, p[2] / 100, -p[1] / 100],
    rotation: [r[0] ?? 0, (r[2] ?? 0) + Math.PI, -(r[1] ?? 0)],
    scale: [s[0] ?? 1, s[1] ?? 1, s[2] ?? 1],
    label: item.name,
  }
}

function Model({ item }: { item: PlacedItem }) {
  const { scene } = useGLTF(item.url)
  const cloned = useMemo(() => scene.clone(true), [scene])
  return (
    <group position={item.position} rotation={item.rotation} scale={item.scale}>
      <primitive object={cloned} />
      {item.highlight && (
        <Html center distanceFactor={8}><span className="text-[10px] bg-[#D1903E] text-white px-1.5 py-0.5 whitespace-nowrap">{item.label ?? item.id}</span></Html>
      )}
    </group>
  )
}

function Room({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} rotation={[-Math.PI / 2, 0, 0]} />
}

// Furniture the user added on the web that has no GLB: a labelled box so the
// placement is still visible and shoppable.
function Placeholder({ item }: { item: PlacedItem }) {
  return (
    <group position={item.position}>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.8, 0.6, 0.8]} />
        <meshStandardMaterial color="#D1903E" transparent opacity={0.6} />
      </mesh>
      <Html center position={[0, 0.8, 0]} distanceFactor={8}><span className="text-[10px] bg-[#10182B] text-white px-1.5 py-0.5 whitespace-nowrap">{item.label ?? item.id}</span></Html>
    </group>
  )
}

export default function DesignViewer({ roomUrl, items }: { roomUrl: string; items: PlacedItem[] }) {
  return (
    <div className="w-full aspect-[16/10] bg-[#1b1f2a] relative">
      <Canvas camera={{ position: [4, 3, 6], fov: 55 }} gl={{ antialias: true }} dpr={[1, 1.5]}>
        <color attach="background" args={['#1b1f2a']} />
        <ambientLight intensity={1.0} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} />
        <pointLight position={[0, 2.5, 0]} intensity={2.5} distance={15} color="#fff5e6" />
        <Suspense fallback={<Html center><span className="text-white/80 text-sm">Loading room…</span></Html>}>
          <Room url={roomUrl} />
          {items.map((it) => (it.url ? <Model key={it.id} item={it} /> : <Placeholder key={it.id} item={it} />))}
        </Suspense>
        <OrbitControls makeDefault enableDamping />
      </Canvas>
      <p className="absolute bottom-2 left-3 text-[11px] text-white/60">Drag to orbit · scroll to zoom</p>
    </div>
  )
}
