'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Html, OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
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

// Scanned rooms ship huge textures; without a cap the GPU runs out of memory
// and Chrome drops the WebGL context (the "sad face" canvas). Same limits as
// the app's viewer: room 2048px, furniture 1024px.
const TEXTURE_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'bumpMap', 'alphaMap'] as const
const downscaled = new WeakSet<THREE.Texture>()
function capTextures(root: THREE.Object3D, maxSize: number) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of mats) {
      for (const key of TEXTURE_KEYS) {
        const tex = (mat as unknown as Record<string, THREE.Texture | null>)[key]
        const image = tex?.image as (HTMLImageElement | HTMLCanvasElement | ImageBitmap) | undefined
        if (!tex || !image || downscaled.has(tex)) continue
        downscaled.add(tex)
        const w = (image as HTMLImageElement).width
        const h = (image as HTMLImageElement).height
        if (!w || !h || Math.max(w, h) <= maxSize) continue
        const scale = maxSize / Math.max(w, h)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(w * scale)
        canvas.height = Math.round(h * scale)
        canvas.getContext('2d')?.drawImage(image as CanvasImageSource, 0, 0, canvas.width, canvas.height)
        tex.image = canvas
        tex.needsUpdate = true
      }
    }
  })
}

function Model({ item }: { item: PlacedItem }) {
  const { scene } = useGLTF(item.url)
  const cloned = useMemo(() => {
    capTextures(scene, 1024)
    return scene.clone(true)
  }, [scene])
  return (
    <group position={item.position} rotation={item.rotation} scale={item.scale}>
      <primitive object={cloned} />
      {item.highlight && (
        <Html center distanceFactor={8}><span className="text-[10px] bg-[#D1903E] text-white px-1.5 py-0.5 whitespace-nowrap">{item.label ?? item.id}</span></Html>
      )}
    </group>
  )
}

export type RoomFrame = { center: [number, number, number]; floorY: number }

function Room({ url, onFrame }: { url: string; onFrame?: (f: RoomFrame) => void }) {
  const { scene } = useGLTF(url)
  const group = useRef<THREE.Group>(null)
  const { camera, controls } = useThree()
  // Frame the whole room once it's in the scene (rooms are not centered at
  // the origin), then let OrbitControls take over.
  useEffect(() => {
    if (!group.current) return
    capTextures(scene, 2048)
    const box = new THREE.Box3().setFromObject(group.current)
    if (box.isEmpty()) return
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    onFrame?.({ center: [center.x, center.y, center.z], floorY: box.min.y })
    const radius = Math.max(size.x, size.z) * 0.9
    camera.position.set(center.x + radius * 0.7, center.y + size.y * 1.2, center.z + radius)
    camera.lookAt(center)
    const ctl = controls as unknown as { target: THREE.Vector3; update: () => void } | null
    if (ctl?.target) {
      ctl.target.copy(center)
      ctl.update()
    }
  }, [scene, camera, controls, onFrame])
  return (
    <group ref={group} rotation={[-Math.PI / 2, 0, 0]}>
      <primitive object={scene} />
    </group>
  )
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

export default function DesignViewer({ roomUrl, items, onRoomFrame }: { roomUrl: string; items: PlacedItem[]; onRoomFrame?: (f: RoomFrame) => void }) {
  // If the browser drops the WebGL context anyway, offer a one-click remount
  // instead of a dead canvas.
  const [lost, setLost] = useState(false)
  const [generation, setGeneration] = useState(0)
  const onCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault()
      setLost(true)
    })
  }, [])
  if (lost) {
    return (
      <div className="w-full aspect-[16/10] bg-[#1b1f2a] relative flex flex-col items-center justify-center text-white/80 text-sm gap-3">
        <p>The 3D view was interrupted by the browser.</p>
        <button onClick={() => { setLost(false); setGeneration((g) => g + 1) }} className="bg-[#D1903E] text-white px-4 py-2 text-sm">Reload 3D view</button>
      </div>
    )
  }
  return (
    <div className="w-full aspect-[16/10] bg-[#1b1f2a] relative">
      <Canvas key={generation} onCreated={onCreated} camera={{ position: [4, 3, 6], fov: 55 }} gl={{ antialias: true, powerPreference: 'high-performance' }} dpr={1}>
        <color attach="background" args={['#1b1f2a']} />
        <ambientLight intensity={1.0} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} />
        <pointLight position={[0, 2.5, 0]} intensity={2.5} distance={15} color="#fff5e6" />
        <Suspense fallback={<Html center><span className="text-white/80 text-sm">Loading room…</span></Html>}>
          <Room url={roomUrl} onFrame={onRoomFrame} />
          {items.map((it) => (it.url ? <Model key={it.id} item={it} /> : <Placeholder key={it.id} item={it} />))}
        </Suspense>
        <OrbitControls makeDefault enableDamping />
      </Canvas>
      <p className="absolute bottom-2 left-3 text-[11px] text-white/60">Drag to orbit · scroll to zoom</p>
    </div>
  )
}
