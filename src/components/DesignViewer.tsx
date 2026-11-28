/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
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

// A whole-room design replaces the room's own furniture: scene.json's
// hiddenRoomNodes are node indices of the room GLB (the app's viewer takes the
// same nodes out). Resolved through the loader's own node objects, not
// parser.associations (three gives nodes sharing a mesh the last one's index).
// Hidden, not removed: useGLTF caches the room, and another design of the same
// room may hide other nodes — the cleanup shows them again.
function useHiddenNodes(gltf: { parser?: any }, nodes: number[]) {
  const key = nodes.join(',')
  useEffect(() => {
    const parser = gltf.parser
    const count = Array.isArray(parser?.json?.nodes) ? parser.json.nodes.length : 0
    const wanted = Array.from(new Set(nodes)).filter((n) => Number.isInteger(n) && n >= 0 && n < count)
    if (!wanted.length) return
    let hidden: THREE.Object3D[] = []
    let cancelled = false
    Promise.all(wanted.map((n) => parser.getDependency('node', n) as Promise<THREE.Object3D>)).then((objs) => {
      if (cancelled) return
      hidden = objs.filter((o) => o && o.visible)
      hidden.forEach((o) => (o.visible = false))
    })
    return () => {
      cancelled = true
      hidden.forEach((o) => (o.visible = true))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf, key])
}

// ---- See inside from outside (a port of the app's cutaway, Room3DViewerDemo1) ----
// Rooms from the rooms API are closed boxes (walls and a ceiling). From an
// outside camera, the ceiling is hidden and so is every wall standing between
// the camera and the furniture or the floor. Only the shell is cut: where the
// room names it (wall, wall-west, Wall0, floor, ceiling), its own furniture is
// never hidden; a room without names cuts every mesh.
const SHELL_NAME = /^(wall([-_][a-z]+)?|floor|ceiling)[-_]?\d*$/i
const OBJECT_NAME = /^[a-z]+\d+$/i // RoomPlan objects: Bed0, Storage0
function shellKind(o: THREE.Object3D): 'shell' | 'piece' | 'unnamed' {
  let object = false
  for (let n: THREE.Object3D | null = o; n; n = n.parent) {
    if (n.name?.startsWith('source-geometry')) return 'piece'
    if (n.name && SHELL_NAME.test(n.name)) return object && /^floor/i.test(n.name) ? 'piece' : 'shell'
    if (n.name && OBJECT_NAME.test(n.name)) object = true
  }
  return 'unnamed'
}
type Cut = { box: THREE.Box3; ceiling: THREE.Mesh[]; walls: THREE.Mesh[] }
function buildCut(root: THREE.Object3D): Cut | null {
  root.updateMatrixWorld(true)
  const all: THREE.Mesh[] = []
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) all.push(o as THREE.Mesh) })
  const kinds = all.map(shellKind)
  const shell = kinds.includes('shell') ? all.filter((_, i) => kinds[i] === 'shell') : all
  if (shell.length < 4) return null // one scanned mesh: nothing sensible to cut
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const cut: Cut = { box, ceiling: [], walls: [] }
  const b = new THREE.Box3()
  const c = new THREE.Vector3()
  for (const m of shell) {
    b.setFromObject(m).getCenter(c)
    const hy = (c.y - box.min.y) / Math.max(size.y, 1e-6)
    if (hy > 0.88) cut.ceiling.push(m)
    else if (hy >= 0.12) cut.walls.push(m)
  }
  return cut
}
function Cutaway({ cut, items }: { cut: Cut; items: PlacedItem[] }) {
  const { camera } = useThree()
  const last = useRef('')
  const ray = useMemo(() => new THREE.Raycaster(), [])
  useEffect(() => () => [...cut.ceiling, ...cut.walls].forEach((m) => (m.visible = true)), [cut])
  useFrame(() => {
    const p = camera.position
    const key = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}|${items.length}`
    if (key === last.current) return
    last.current = key
    const { box } = cut
    const centre = box.getCenter(new THREE.Vector3())
    const radius = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.5
    const inside = Math.hypot(p.x - centre.x, p.z - centre.z) <= radius * 0.95 && p.y < box.max.y && p.y > box.min.y
    cut.ceiling.forEach((m) => (m.visible = inside))
    // Points that must stay in view: every piece, and a 3 x 3 floor grid at knee height.
    const pts = items.map((it) => new THREE.Vector3(it.position[0], box.min.y + 0.4, it.position[2]))
    for (let i = 1; i <= 3; i++) for (let k = 1; k <= 3; k++) {
      pts.push(new THREE.Vector3(box.min.x + ((box.max.x - box.min.x) * i) / 4, box.min.y + 0.45, box.min.z + ((box.max.z - box.min.z) * k) / 4))
    }
    const hide = new Set<THREE.Object3D>()
    if (!inside) {
      const dir = new THREE.Vector3()
      for (const t of pts) {
        dir.copy(t).sub(p)
        const dist = dir.length()
        if (dist < 1e-3) continue
        ray.set(p, dir.normalize())
        ray.far = dist - 0.02
        for (const h of ray.intersectObjects(cut.walls, false)) hide.add(h.object)
      }
    }
    cut.walls.forEach((w) => (w.visible = !hide.has(w)))
  })
  return null
}

function Room({ url, hiddenNodes, items, onFrame }: { url: string; hiddenNodes: number[]; items: PlacedItem[]; onFrame?: (f: RoomFrame) => void }) {
  const gltf = useGLTF(url)
  const { scene } = gltf
  useHiddenNodes(gltf as { parser?: any }, hiddenNodes)
  const group = useRef<THREE.Group>(null)
  const { camera, controls } = useThree()
  const [cut, setCut] = useState<Cut | null>(null)
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
    setCut(buildCut(group.current))
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
    <>
      <group ref={group} rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={scene} />
      </group>
      {cut && <Cutaway cut={cut} items={items} />}
    </>
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

export default function DesignViewer({ roomUrl, hiddenRoomNodes = [], items, onRoomFrame }: { roomUrl: string; hiddenRoomNodes?: number[]; items: PlacedItem[]; onRoomFrame?: (f: RoomFrame) => void }) {
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
          <Room url={roomUrl} hiddenNodes={hiddenRoomNodes} items={items} onFrame={onRoomFrame} />
          {items.map((it) => (it.url ? <Model key={it.id} item={it} /> : <Placeholder key={it.id} item={it} />))}
        </Suspense>
        <OrbitControls makeDefault enableDamping />
      </Canvas>
      <p className="absolute bottom-2 left-3 text-[11px] text-white/60">Drag to orbit · scroll to zoom</p>
    </div>
  )
}
