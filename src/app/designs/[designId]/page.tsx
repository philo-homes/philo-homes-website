'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { Plus, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import { toast } from '@/components/Toast'
import Shell from '@/components/Shell'
import { Button } from '@/components/Section'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import type { CatalogItem, FurnitureItem, RoomFurniturePiece, SceneJson } from '@/lib/designs'
import { Product, productImage, productPrice, resolveSku } from '@/lib/medusa'
import { formatPrice } from '@/lib/format'
import { modeLabel, roomTypeLabel } from '@/lib/designModes'
import type { AppViewerHandle, ViewerEvent, ViewerSceneData, ViewerSceneExport } from '@/components/AppViewer'

// The app's viewer runs in an iframe; nothing of it renders on the server.
const AppViewer = dynamic(() => import('@/components/AppViewer'), { ssr: false, loading: () => <div className="w-full aspect-[16/10] bg-[#f5f5f5]" /> })

// GET /api/designs/:designId — a rooms-API design (the app's Rooms) with its scene.
type Payload = {
  design_id: string
  status: string
  version: number
  render_running: boolean
  name: string | null
  design_type: string
  mode: string | null
  design_style: string | null
  error: string | null
  render_urls: string[]
  scene: SceneJson | null
  room_furniture: RoomFurniturePiece[]
  room: { room_id: string; name: string | null; room_type: string; room_length: number | null; room_width: number | null } | null
}

const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
// The app's roomTypeLabel, which it also uses for the room's own pieces ("Bed0_World" -> "Bed0 World").
const pieceLabel = (s: string) => {
  const words = s.replace(/[-_]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
const TYPE_LABEL: Record<string, string> = { whole_room: 'Whole room', single_item: 'One piece', manual: 'Arranged by you' }
// The app's left-hand tools (RoomDesignParts ROTATIONS).
const ROTATIONS = [
  [-90, 'Turn left 90°'],
  [-15, 'Turn left 15°'],
  [15, 'Turn right 15°'],
  [90, 'Turn right 90°'],
] as const
// Viewer ids are '<sku>', '<sku>#2' (a second copy) or '<sku>#w3' (added here).
const skuOf = (viewerId: string) => viewerId.replace(/#.*$/, '')
const chip = (on = false) => `shadow px-3 py-1.5 text-xs rounded-full ${on ? 'bg-[#10182B] text-white' : 'bg-white/95 text-[#1F1F1F]'}`

/**
 * scene.json in the viewer, as the app's loadDesignScene builds it: unique
 * viewer ids for repeated skus, itemIndex mapping them back, positions in
 * metres (pipeline frame, Z-up).
 */
function viewerScene(scene: SceneJson) {
  const seen: Record<string, number> = {}
  const itemIndex: Record<string, number> = {}
  const items: Array<FurnitureItem & { viewerId: string }> = []
  ;(scene.furnitureUrls ?? []).forEach((f, i) => {
    if (!Array.isArray(f.position) || f.position.length !== 3) return
    seen[f.id] = (seen[f.id] ?? 0) + 1
    const viewerId = seen[f.id] === 1 ? f.id : `${f.id}#${seen[f.id]}`
    itemIndex[viewerId] = i
    items.push({ ...f, viewerId })
  })
  const sceneData: ViewerSceneData = {
    environment: 'studio',
    frame: 'pipeline',
    items: [
      {
        id: 'room',
        name: 'room.glb',
        url: scene.roomUrl as string,
        lit: true,
        zUp: true,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        hiddenNodes: (scene.hiddenRoomNodes ?? []).filter((n) => Number.isInteger(n) && n >= 0),
      },
      ...items.map((f) => ({
        id: f.viewerId,
        name: `${f.id}.glb`,
        url: f.url,
        position: f.position.map((n) => n / 100),
        rotation: Array.isArray(f.rotation) ? f.rotation : [0, 0, 0],
        scale: Array.isArray(f.scale) ? f.scale : [1, 1, 1],
      })),
    ],
  }
  return { sceneData, items, itemIndex }
}

/** The app's sceneJsonFromExport: metadata carried over for pieces already there; new ones are source: manual. */
function sceneFromExport(exp: ViewerSceneExport, base: SceneJson, itemIndex: Record<string, number>, added: Record<string, CatalogItem>) {
  return {
    hiddenRoomNodes: exp.hiddenRoomNodes,
    furnitureUrls: exp.items.map((it) => {
      const idx = itemIndex[it.id]
      const was = idx != null ? base.furnitureUrls[idx] : undefined
      const c = added[it.id]
      return {
        ...(was ?? { source: 'manual', name: c?.name, price: c?.price ?? null, originalPrice: c?.original_price ?? null, image: c?.image_url ?? null }),
        id: skuOf(it.id),
        url: it.url,
        position: it.position,
        rotation: it.rotation,
        // Catalog GLBs are true size; the backend takes only [1, 1, 1].
        scale: [1, 1, 1],
        ...(it.replaces ? { replaces: { sku: skuOf(it.replaces) } } : {}),
      }
    }),
  }
}

export default function DesignDetailPage() {
  const { designId } = useParams<{ designId: string }>()
  const { customer, token, loading } = useAuth()
  const { add, busy } = useCart()
  const viewer = useRef<AppViewerHandle>(null)
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState('')
  const [load, setLoad] = useState(0) // bump to reload the design (Discard, after a save)
  const [products, setProducts] = useState<Record<string, Product | null>>({})
  const [name, setName] = useState('')
  const [renaming, setRenaming] = useState(false)
  // The 3D view, as in the app's design view (useRoomDesigns viewEdit).
  const [ready, setReady] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [removed, setRemoved] = useState<string[]>([]) // viewer ids of shop pieces deleted
  const [deletedRoom, setDeletedRoom] = useState<string[]>([]) // 'node:N' of the room's own pieces deleted
  const [added, setAdded] = useState<Record<string, CatalogItem>>({})
  const [dirty, setDirty] = useState(false)
  const dirtyRef = useRef(false)
  dirtyRef.current = dirty
  const [canUndo, setCanUndo] = useState(false)
  const [cut, setCut] = useState({ ceiling: true, walls: false })
  const [saving, setSaving] = useState(false)
  const [picker, setPicker] = useState(false)
  const [pickerQ, setPickerQ] = useState('')
  const [catalogItems, setCatalogItems] = useState<CatalogItem[] | null>(null)
  const addSeq = useRef(0)

  useEffect(() => {
    if (!token) return
    fetch(`/api/designs/${designId}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.message || 'Could not load this design.')
        return r.json()
      })
      .then((d: Payload) => {
        setData(d)
        setName(d.name ?? '')
      })
      .catch((e) => setError(e.message))
  }, [designId, token, load])

  const scene = useMemo(() => (data?.scene?.roomUrl ? viewerScene(data.scene) : null), [data])
  const sceneKey = `${designId}:v${data?.version ?? 0}:${load}`

  // A fresh scene: nothing selected, deleted, added or changed in it yet.
  useEffect(() => {
    setReady(false)
    setSelected(null)
    setRemoved([])
    setDeletedRoom([])
    setAdded({})
    setDirty(false)
    setCanUndo(false)
  }, [sceneKey])

  // Edit mode with the room's own pieces (not those the design took out) as
  // targets — sent again a little later, as the app does, in case the page
  // was still settling. Not once something changed: setArrangeTargets starts
  // arranging afresh (it forgets what was deleted, so Restore would not work).
  useEffect(() => {
    if (!ready || !data) return
    const hidden = data.scene?.hiddenRoomNodes ?? []
    const list = data.room_furniture.filter((p) => !hidden.includes(p.node)).map((p) => ({ node: p.node }))
    const send = () => {
      viewer.current?.setEditMode(true)
      viewer.current?.setArrangeTargets(list)
    }
    send()
    const timers = [1500, 4000].map((ms) => setTimeout(() => !dirtyRef.current && send(), ms))
    return () => timers.forEach(clearTimeout)
  }, [ready, data])

  useEffect(() => {
    if (ready) viewer.current?.setRoomCut(cut)
  }, [cut, ready])

  const onEvent = useCallback((e: ViewerEvent) => {
    const ev = e as any
    if (['moved', 'rotated', 'hidden', 'removed', 'restored', 'placed'].includes(ev.type)) setDirty(true)
    switch (ev.type) {
      case 'sceneReady':
        setReady(true)
        break
      case 'viewerReset':
        setReady(false)
        break
      case 'selected':
      case 'placed':
        setSelected(ev.id ?? null)
        break
      case 'confirmed':
        setSelected(null)
        break
      case 'arrangeState':
        setCanUndo(!!ev.canUndo)
        break
      case 'placeFailed':
        setAdded((prev) => {
          const next = { ...prev }
          delete next[ev.id]
          return next
        })
        toast.error('That piece could not be loaded.')
        break
      case 'removed':
      case 'hidden': {
        const id = ev.id as string
        setSelected((prev) => (prev === id ? null : prev))
        if (id.startsWith('node:')) setDeletedRoom((prev) => (prev.includes(id) ? prev : [...prev, id]))
        else setRemoved((prev) => (prev.includes(id) ? prev : [...prev, id]))
        break
      }
      case 'restored': {
        const id = ev.id as string
        setDeletedRoom((prev) => prev.filter((k) => k !== id))
        setRemoved((prev) => prev.filter((k) => k !== id))
        break
      }
    }
  }, [])

  // The shop pieces in the room now: the design's, minus deleted, plus added here.
  const pieces = useMemo(() => {
    const fromDesign = (scene?.items ?? []).map((f) => ({ viewerId: f.viewerId, sku: f.id, name: f.name, price: f.price ?? null, image: f.image ?? null }))
    const fromHere = Object.entries(added).map(([viewerId, c]) => ({ viewerId, sku: c.sku, name: c.name, price: c.price, image: c.image_url }))
    return [...fromDesign, ...fromHere].filter((p) => !removed.includes(p.viewerId))
  }, [scene, added, removed])

  // Match each piece (catalog sku) to its shop product.
  const skuKey = Array.from(new Set(pieces.map((p) => p.sku))).sort().join(',')
  useEffect(() => {
    if (!skuKey) return
    let live = true
    Promise.all(skuKey.split(',').map(async (sku) => [sku, await resolveSku(sku)] as const)).then((pairs) => {
      if (live) setProducts((prev) => ({ ...prev, ...Object.fromEntries(pairs) }))
    })
    return () => {
      live = false
    }
  }, [skuKey])

  useEffect(() => {
    if (!picker || catalogItems || !token) return
    const q = data?.room?.room_type ? `?room_type=${encodeURIComponent(data.room.room_type)}` : ''
    fetch(`/api/catalog${q}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((r) => setCatalogItems(r.items ?? []))
      .catch(() => setCatalogItems([]))
  }, [picker, catalogItems, token, data?.room?.room_type])

  const placeFromCatalog = (c: CatalogItem) => {
    const viewerId = `${c.sku}#w${++addSeq.current}`
    setAdded((prev) => ({ ...prev, [viewerId]: c }))
    viewer.current?.placeItem({ id: viewerId, url: c.model_3d_url, klass: 'floor' })
    setPicker(false)
  }

  const save = async () => {
    if (!token || !data?.scene || !scene) return
    setSaving(true)
    try {
      viewer.current?.selectItem(null)
      let exp: ViewerSceneExport
      try {
        exp = await viewer.current!.exportScene()
      } catch {
        toast.error('The 3D scene could not be read. Please try again.')
        return
      }
      const body = { base_version: data.version, scene: sceneFromExport(exp, data.scene, scene.itemIndex, added) }
      const r = await fetch(`/api/designs/${designId}/scene`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const res = await r.json().catch(() => ({}))
      if (!r.ok) {
        toast.error(res?.message || 'Could not save the design.')
        return
      }
      toast.success('Saved — the app shows this version too.')
      setLoad((n) => n + 1)
    } finally {
      setSaving(false)
    }
  }
  const discard = () => setLoad((n) => n + 1)

  const deleteDesign = async () => {
    if (!token || !window.confirm('Delete this design? This removes it from the app too and cannot be undone.')) return
    const r = await fetch(`/api/designs/${designId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (!r.ok) {
      toast.error('Could not delete this design.')
      return
    }
    toast.success('Design deleted')
    window.location.href = '/designs'
  }

  // Renamed in the rooms API, so the app shows the same name.
  const saveName = async () => {
    const next = name.trim()
    if (token && next && next !== (data?.name ?? '')) {
      const r = await fetch(`/api/designs/${designId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: next }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) {
        toast.error(body?.message || 'Could not save the name.')
        return
      }
      setData((d) => (d ? { ...d, name: body.name ?? next } : d))
      setName(body.name ?? next)
    } else {
      setName(data?.name ?? '')
    }
    setRenaming(false)
  }

  const cartLine = (sku: string) => products[sku]?.variants?.[0]?.id
  const meta = { source: 'design', room_id: data?.room?.room_id, design_id: designId }
  const addAllToCart = async () => {
    const variants = pieces.map((p) => cartLine(p.sku)).filter(Boolean) as string[]
    if (variants.length === 0) {
      toast.error(pieces.length ? 'None of these pieces are in the shop yet.' : 'This design has no furniture to add.')
      return
    }
    let ok = 0
    for (const v of variants) if (await add(v, 1, meta)) ok += 1
    const missing = pieces.length - ok
    if (ok > 0) toast.success(`${ok} item${ok === 1 ? '' : 's'} added to cart${missing > 0 ? ` · ${missing} not in the shop yet` : ''}`)
  }

  if (loading) return <Shell><p className="text-sm">Loading…</p></Shell>
  if (!customer) return <Shell><p className="text-sm"><Link href={`/login?next=/designs/${designId}`} className="underline">Sign in</Link> to open this design.</p></Shell>
  if (error) return <Shell><p className="text-sm text-red-600">{error}</p></Shell>
  if (!data) return <Shell wide><div className="w-full aspect-[16/10] bg-[#F5F4F0] animate-pulse" /></Shell>
  if (data.status === 'FAILED') {
    return <Shell><p className="text-sm">This design failed to generate. Try it again from the room in the app.</p></Shell>
  }
  if (!scene) {
    const label = data.status === 'COMPLETE' ? 'finishing up' : `still ${data.status.toLowerCase().replace(/_/g, ' ')}`
    return <Shell><p className="text-sm">This design is {label}. Check back in a few minutes.</p></Shell>
  }

  const { room } = data
  const roomLabel = room ? room.name || titleCase(room.room_type) : 'Room'
  const typeLabel = data.mode ? modeLabel(data.mode) : TYPE_LABEL[data.design_type] ?? data.design_type
  const dims = room?.room_length && room?.room_width ? `${(room.room_length / 100).toFixed(1)} × ${(room.room_width / 100).toFixed(1)} m` : null
  const images = data.render_urls ?? []
  const roomPiece = (key: string) => data.room_furniture.find((p) => `node:${p.node}` === key)

  return (
    <Shell wide>
      <p className="text-xs text-[#8E8E8E] mb-4">
        <Link href="/designs" className="hover:text-[#10182B]">My Designs</Link>
        {room && (
          <>
            {' / '}<Link href={`/designs?type=${encodeURIComponent(room.room_type)}`} className="hover:text-[#10182B]">{roomTypeLabel(room.room_type)}</Link>
            {' / '}<Link href={`/designs?type=${encodeURIComponent(room.room_type)}&room=${room.room_id}`} className="hover:text-[#10182B]">{roomLabel}</Link>
            {data.mode && <>{' / '}<Link href={`/designs?type=${encodeURIComponent(room.room_type)}&room=${room.room_id}&mode=${data.mode}`} className="hover:text-[#10182B]">{modeLabel(data.mode)}</Link></>}
          </>
        )}
        {' / '}<span className="text-[#10182B]">{data.name || typeLabel}</span>
      </p>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          {renaming ? (
            <div className="flex gap-2">
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="border border-[#e1e1e1] px-3 py-1 text-xl" style={{ fontFamily: "'Henry Trial', serif" }} />
              <Button variant="outline" onClick={saveName}>Save</Button>
            </div>
          ) : (
            <h1 className="text-3xl cursor-text" style={{ fontFamily: "'Henry Trial', serif" }} onClick={() => setRenaming(true)} title="Click to rename">
              {data.name || `${roomLabel} · ${data.design_style ?? typeLabel}`}
            </h1>
          )}
          <p className="text-sm text-[#4B4B4B] mt-1">{[roomLabel, typeLabel, data.design_style, dims].filter(Boolean).join(' · ')} · {pieces.length} pieces</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setPicker(true)}><Plus size={16} className="mr-1" /> Add furniture</Button>
          <Button onClick={addAllToCart} disabled={busy}>Add whole room to cart</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <div className="relative">
            <AppViewer ref={viewer} sceneData={scene.sceneData} sceneKey={sceneKey} onEvent={onEvent} />
            {ready && (
              <>
                {/* Ceiling and walls off/on, top right (as in the app). */}
                <div className="absolute top-16 right-5 flex gap-2">
                  <button className={chip(cut.ceiling)} onClick={() => setCut((c) => ({ ...c, ceiling: !c.ceiling }))}>{cut.ceiling ? 'Ceiling off' : 'Ceiling'}</button>
                  <button className={chip(cut.walls)} onClick={() => setCut((c) => ({ ...c, walls: !c.walls }))}>{cut.walls ? 'Walls off' : 'Walls'}</button>
                </div>
                {/* The selected piece: turn it or delete it (tap it again to unselect). */}
                {selected && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                    {ROTATIONS.map(([deg, label]) => (
                      <button key={deg} className={`${chip()} flex items-center gap-1`} onClick={() => viewer.current?.rotateItem(deg)} aria-label={label} title={label}>
                        {deg < 0 ? <RotateCcw size={12} /> : <RotateCw size={12} />} {Math.abs(deg)}°
                      </button>
                    ))}
                    <button className={`${chip()} flex items-center justify-center text-red-600!`} onClick={() => viewer.current?.removeItem(selected)} aria-label="Delete this piece" title="Delete this piece">
                      <Trash2 size={14} className="text-red-600" />
                    </button>
                  </div>
                )}
                {dirty && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3 bg-white/95 shadow px-4 py-2 rounded-full text-xs items-center whitespace-nowrap">
                    {canUndo && <button className="underline" onClick={() => viewer.current?.undoArrange()}>Undo</button>}
                    <span className="text-[#8E8E8E]">Unsaved changes</span>
                    <button className="underline" onClick={discard}>Discard</button>
                    <button disabled={saving} className="bg-[#D1903E] text-white px-3 py-1 rounded-full disabled:opacity-60" onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button>
                  </div>
                )}
              </>
            )}
          </div>
          <p className="text-[11px] text-[#8E8E8E] mt-2">Click a piece to select it, click it again to unselect. Drag a selected piece to move it. Saved changes show up in the app too.</p>
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {images.slice(0, 3).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" className="aspect-[4/3] w-full object-cover" />
              ))}
            </div>
          )}
        </div>
        <aside className="lg:col-span-4">
          <h2 className="text-lg mb-3" style={{ fontFamily: "'Henry Trial', serif" }}>From the shop</h2>
          {pieces.length === 0 && <p className="text-sm text-[#8E8E8E]">No shop pieces in this design.</p>}
          <ul className="divide-y divide-[#e8e4dc]">
            {pieces.map((f) => {
              const p = products[f.sku]
              const img = (p ? productImage(p) : null) || f.image
              return (
                <li key={f.viewerId} className={`py-3 flex gap-3 ${selected === f.viewerId ? 'bg-[#FCF9F2] -mx-2 px-2' : ''}`}>
                  <button className="w-16 h-16 bg-[#F5F4F0] shrink-0" onClick={() => viewer.current?.selectItem(f.viewerId)} title="Select in the 3D view">
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {p?.title ?? f.name ?? f.sku}
                      {added[f.viewerId] && <span className="ml-1 text-[10px] uppercase tracking-wider text-[#D1903E]">added here</span>}
                    </p>
                    <p className="text-xs text-[#4B4B4B]">{p ? formatPrice(productPrice(p)) : p === null ? 'Not in the shop yet' : 'Looking up…'}</p>
                    <div className="flex gap-3 mt-1 text-xs">
                      {p && <Link href={`/shop/${p.handle}`} className="underline">View</Link>}
                      {p && <button disabled={busy} onClick={() => { const v = cartLine(f.sku); if (v) add(v, 1, meta) }} className="underline">Add to cart</button>}
                      <button onClick={() => viewer.current?.removeItem(f.viewerId)} className="text-[#8E8E8E] hover:text-red-600 flex items-center gap-1"><Trash2 size={12} /> Remove</button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          {deletedRoom.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm mb-2">Deleted from the real room</h3>
              <ul className="divide-y divide-[#e8e4dc]">
                {deletedRoom.map((key) => {
                  const rp = roomPiece(key)
                  return (
                    <li key={key} className="py-2 flex items-center gap-3 text-sm">
                      <div className="w-10 h-10 bg-[#F5F4F0] shrink-0">
                        {rp?.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={rp.image_url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <span className="flex-1 truncate">{rp ? pieceLabel(rp.name || rp.category) : key}</span>
                      <button className="underline text-xs" onClick={() => viewer.current?.restoreDeleted(key)}>Restore</button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          <button onClick={deleteDesign} className="mt-6 text-xs text-[#8E8E8E] hover:text-red-600 flex items-center gap-1"><Trash2 size={12} /> Delete this design</button>
        </aside>
      </div>

      {picker && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setPicker(false)}>
          <div className="bg-white w-full max-w-3xl max-h-[80vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg" style={{ fontFamily: "'Henry Trial', serif" }}>Add furniture to this room</h2>
              <button onClick={() => setPicker(false)} className="text-sm underline">Close</button>
            </div>
            <input value={pickerQ} onChange={(e) => setPickerQ(e.target.value)} placeholder="Search the catalog…" className="w-full border border-[#e1e1e1] px-3 py-2 text-sm mb-4" />
            {catalogItems === null ? (
              <p className="text-sm text-[#8E8E8E]">Loading…</p>
            ) : catalogItems.length === 0 ? (
              <p className="text-sm text-[#8E8E8E]">No pieces with a 3D model for this room yet.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {catalogItems.filter((c) => !pickerQ || c.name.toLowerCase().includes(pickerQ.toLowerCase())).map((c) => (
                  <button key={c.sku} onClick={() => placeFromCatalog(c)} className="text-left group">
                    <div className="aspect-square bg-[#F5F4F0] overflow-hidden">
                      {c.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      )}
                    </div>
                    <p className="text-sm mt-1 truncate">{c.name}</p>
                    <p className="text-xs text-[#4B4B4B]">{c.price != null ? formatPrice(c.price) : ''}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Shell>
  )
}
