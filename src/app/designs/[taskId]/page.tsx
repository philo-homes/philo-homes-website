'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from '@/components/Toast'
import Shell from '@/components/Shell'
import { Button } from '@/components/Section'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import type { FurnitureData, TaskResult } from '@/lib/designs'
import { catalog, DesignEdit, Product, productImage, productPrice, readDesignEdits, readDesignNames, resolveSku, writeDesignEdit, writeDesignName } from '@/lib/medusa'
import { formatPrice } from '@/lib/format'
import { toScene, type PlacedItem, type RoomFrame } from '@/components/DesignViewer'

// three.js only runs in the browser
const DesignViewer = dynamic(() => import('@/components/DesignViewer'), { ssr: false, loading: () => <div className="w-full aspect-[16/10] bg-[#1b1f2a]" /> })

type Payload = { task_id: string; status: string; result: TaskResult | null; furniture: FurnitureData | null }

export default function DesignDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const { customer, token, loading, refresh } = useAuth()
  const { add, busy } = useCart()
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState('')
  const [products, setProducts] = useState<Record<string, Product | null>>({})
  const [edit, setEdit] = useState<DesignEdit>({ removed: [], added: [] })
  const [picker, setPicker] = useState(false)
  const [pickerQ, setPickerQ] = useState('')
  const [all, setAll] = useState<Product[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [renaming, setRenaming] = useState(false)
  // Where the room actually sits in the scene (rooms are not at the origin):
  // new furniture is dropped on its floor near the center.
  const [roomFrame, setRoomFrame] = useState<RoomFrame>({ center: [0, 0, 0], floorY: 0 })

  useEffect(() => {
    if (!token) return
    fetch(`/api/designs/${taskId}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.message || 'Could not load this design.')
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
  }, [taskId, token])

  useEffect(() => {
    if (!customer) return
    setEdit(readDesignEdits(customer)[taskId] ?? { removed: [], added: [] })
    setName(readDesignNames(customer)[taskId] ?? '')
  }, [customer, taskId])

  // Match each designed piece (catalog SKU) to its shop product.
  useEffect(() => {
    const items = data?.furniture?.furnitureUrls ?? []
    if (items.length === 0) return
    Promise.all(items.map(async (f) => [f.id, await resolveSku(f.id)] as const)).then((pairs) => {
      setProducts(Object.fromEntries(pairs))
    })
  }, [data])

  useEffect(() => {
    if (picker && all.length === 0) catalog().then(setAll)
  }, [picker, all.length])

  const instances = useMemo(
    () => (data?.furniture?.furnitureUrls ?? []).map((item, i) => ({ item, key: `${item.id}#${i}` })),
    [data],
  )

  const sceneItems: PlacedItem[] = useMemo(() => {
    const base = instances.filter(({ key }) => !edit.removed.includes(key)).map(({ item, key }) => ({ ...toScene(item), id: key }))
    const added: PlacedItem[] = edit.added.map((a) => ({ id: a.id, url: a.url ?? '', position: a.position, rotation: [0, 0, 0], scale: [1, 1, 1], label: a.name }))
    return [...base, ...added].map((it) => ({ ...it, highlight: it.id === selected }))
  }, [instances, edit, selected])

  const persist = async (next: DesignEdit) => {
    const previous = edit
    setEdit(next)
    if (!customer) return
    try {
      await writeDesignEdit(customer, taskId, next)
      await refresh()
    } catch {
      setEdit(previous)
      toast.error('Could not save that change. Please try again.')
    }
  }

  const deleteDesign = async () => {
    if (!token || !window.confirm('Delete this design? This removes it from the app too and cannot be undone.')) return
    const r = await fetch(`/api/designs/${taskId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (!r.ok) {
      toast.error('Could not delete this design.')
      return
    }
    toast.success('Design deleted')
    window.location.href = '/designs'
  }
  const removePiece = (id: string) => persist({ ...edit, removed: Array.from(new Set([...edit.removed, id])) })
  const restorePiece = (id: string) => persist({ ...edit, removed: edit.removed.filter((r) => r !== id) })
  const addPiece = (p: Product) => {
    const glb = typeof p.metadata?.model_3d_url === 'string' ? p.metadata.model_3d_url : typeof p.metadata?.glb_url === 'string' ? p.metadata.glb_url : undefined
    const n = edit.added.length
    const [cx, , cz] = roomFrame.center
    persist({
      ...edit,
      added: [...edit.added, { id: `web-${Date.now()}`, productId: p.id, name: p.title, image: productImage(p), url: glb, position: [cx + 0.7 * (n % 3) - 0.7, roomFrame.floorY, cz + 0.7 * Math.floor(n / 3)] }],
    })
    setPicker(false)
  }
  const removeAdded = (id: string) => persist({ ...edit, added: edit.added.filter((a) => a.id !== id) })
  const nudge = (id: string, dx: number, dz: number) =>
    persist({ ...edit, added: edit.added.map((a) => (a.id === id ? { ...a, position: [a.position[0] + dx, a.position[1], a.position[2] + dz] } : a)) })

  const saveName = async () => {
    if (customer && name.trim()) {
      try {
        await writeDesignName(customer, taskId, name.trim())
        await refresh()
      } catch {
        toast.error('Could not save the name.')
      }
    }
    setRenaming(false)
  }

  const addAllToCart = async () => {
    const ids = instances.filter(({ key }) => !edit.removed.includes(key)).map(({ item }) => products[item.id]?.variants?.[0]?.id).filter(Boolean) as string[]
    const addedIds = edit.added.map((a) => all.find((p) => p.id === a.productId)?.variants?.[0]?.id).filter(Boolean) as string[]
    let ok = 0
    for (const v of [...ids, ...addedIds]) if (await add(v, 1)) ok += 1
    if (ok > 0) toast.success(`${ok} item${ok === 1 ? '' : 's'} added to cart`)
  }

  if (loading) return <Shell><p className="text-sm">Loading…</p></Shell>
  if (!customer) return <Shell><p className="text-sm"><Link href={`/login?next=/designs/${taskId}`} className="underline">Sign in</Link> to open this design.</p></Shell>
  if (error) return <Shell><p className="text-sm text-red-600">{error}</p></Shell>
  if (!data) return <Shell wide><div className="w-full aspect-[16/10] bg-[#F5F4F0] animate-pulse" /></Shell>
  if (data.status === 'FAILED') {
    return <Shell><p className="text-sm">This design failed to generate. Try scanning the room again in the app.</p></Shell>
  }
  if (data.status !== 'COMPLETE' || !data.result?.artifacts) {
    const label = data.status === 'COMPLETE' ? 'finishing up' : `still ${data.status.toLowerCase().replace(/_/g, ' ')}`
    return <Shell><p className="text-sm">This design is {label}. Check back in a few minutes.</p></Shell>
  }

  const { result } = data
  const artifacts = result.artifacts
  if (!artifacts) return null
  const dims = result.room_length && result.room_width ? `${(result.room_length / 100).toFixed(1)} × ${(result.room_width / 100).toFixed(1)} m` : null

  return (
    <Shell wide>
      <p className="text-xs text-[#8E8E8E] mb-4"><Link href="/designs">My Designs</Link> / {name || taskId}</p>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          {renaming ? (
            <div className="flex gap-2">
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="border border-[#e1e1e1] px-3 py-1 text-xl" style={{ fontFamily: "'Henry Trial', serif" }} />
              <Button variant="outline" onClick={saveName}>Save</Button>
            </div>
          ) : (
            <h1 className="text-3xl cursor-text" style={{ fontFamily: "'Henry Trial', serif" }} onClick={() => setRenaming(true)} title="Click to rename">
              {name || `${result.room_type ?? 'Room'} · ${result.design_style ?? 'design'}`}
            </h1>
          )}
          <p className="text-sm text-[#4B4B4B] mt-1">
            {result.room_type} · {result.design_style}{dims ? ` · ${dims}` : ''} · {instances.length - edit.removed.length + edit.added.length} pieces
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setPicker(true)}><Plus size={16} className="mr-1" /> Add furniture</Button>
          <Button onClick={addAllToCart} disabled={busy}>Add whole room to cart</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <DesignViewer roomUrl={artifacts.room_glb} items={sceneItems} onRoomFrame={setRoomFrame} />
          {artifacts.images.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {artifacts.images.slice(0, 3).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" className="aspect-[4/3] w-full object-cover" />
              ))}
            </div>
          )}
        </div>
        <aside className="lg:col-span-4">
          <h2 className="text-lg mb-3" style={{ fontFamily: "'Henry Trial', serif" }}>Furniture in this design</h2>
          <ul className="divide-y divide-[#e8e4dc]">
            {instances.map(({ item: f, key }) => {
              const p = products[f.id]
              const removed = edit.removed.includes(key)
              return (
                <li key={key} className={`py-3 flex gap-3 ${removed ? 'opacity-50' : ''}`} onMouseEnter={() => setSelected(key)} onMouseLeave={() => setSelected(null)}>
                  <div className="w-16 h-16 bg-[#F5F4F0] shrink-0">
                    {(p ? productImage(p) : f.photo_url) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p ? productImage(p) : f.photo_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{p?.title ?? f.name ?? f.id}</p>
                    <p className="text-xs text-[#4B4B4B]">{p ? formatPrice(productPrice(p)) : p === null ? 'Not in catalog' : 'Looking up…'}</p>
                    <div className="flex gap-3 mt-1 text-xs">
                      {p && <Link href={`/shop/${p.handle}`} className="underline">View</Link>}
                      {p && !removed && <button disabled={busy} onClick={() => p.variants?.[0] && add(p.variants[0].id, 1)} className="underline">Add to cart</button>}
                      {removed ? <button onClick={() => restorePiece(key)} className="underline">Put back</button> : <button onClick={() => removePiece(key)} className="text-[#8E8E8E] hover:text-red-600 flex items-center gap-1"><Trash2 size={12} /> Remove</button>}
                    </div>
                  </div>
                </li>
              )
            })}
            {edit.added.map((a) => (
              <li key={a.id} className="py-3 flex gap-3 bg-[#FCF9F2] -mx-2 px-2" onMouseEnter={() => setSelected(a.id)} onMouseLeave={() => setSelected(null)}>
                <div className="w-16 h-16 bg-[#F5F4F0] shrink-0">
                  {a.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.image} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{a.name} <span className="text-[10px] uppercase tracking-wider text-[#D1903E]">added here</span></p>
                  <div className="flex items-center gap-1 mt-1 text-xs">
                    <span className="text-[#8E8E8E] mr-1">Move:</span>
                    <button onClick={() => nudge(a.id, -0.25, 0)} className="border px-1.5">←</button>
                    <button onClick={() => nudge(a.id, 0.25, 0)} className="border px-1.5">→</button>
                    <button onClick={() => nudge(a.id, 0, -0.25)} className="border px-1.5">↑</button>
                    <button onClick={() => nudge(a.id, 0, 0.25)} className="border px-1.5">↓</button>
                    <button onClick={() => removeAdded(a.id)} className="ml-2 text-[#8E8E8E] hover:text-red-600 flex items-center gap-1"><Trash2 size={12} /> Remove</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-[#8E8E8E] mt-4">Changes are saved to your account and show up in the app too.</p>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {all.filter((p) => !pickerQ || p.title.toLowerCase().includes(pickerQ.toLowerCase())).map((p) => (
                <button key={p.id} onClick={() => addPiece(p)} className="text-left group">
                  <div className="aspect-square bg-[#F5F4F0] overflow-hidden">
                    {productImage(p) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={productImage(p)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    )}
                  </div>
                  <p className="text-sm mt-1 truncate">{p.title}</p>
                  <p className="text-xs text-[#4B4B4B]">{formatPrice(productPrice(p))}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
