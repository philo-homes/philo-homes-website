'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Shell from '@/components/Shell'
import { Button } from '@/components/Section'
import { toast } from '@/components/Toast'
import { useCart } from '@/context/CartContext'
import { catalog, Product, productImage, productPrice } from '@/lib/medusa'
import { ROOM_TEMPLATES } from '@/lib/templates'
import { formatPrice } from '@/lib/format'

// A template's pieces resolve to real catalog products by SKU (same as the
// app's resolveTemplateFurniture); pieces without a SKU stay showcase-only.
export default function TemplatePage() {
  const { id } = useParams<{ id: string }>()
  const template = ROOM_TEMPLATES.find((t) => t.id === id)
  const [bySku, setBySku] = useState<Record<string, Product>>({})
  const { add, busy } = useCart()

  useEffect(() => {
    catalog().then((products) => {
      const map: Record<string, Product> = {}
      for (const p of products) for (const v of p.variants ?? []) if (v.sku) map[v.sku] = p
      setBySku(map)
    }).catch(() => setBySku({}))
  }, [])

  const pieces = useMemo(() => (template?.furniture ?? []).map((f) => ({ ...f, product: f.sku ? bySku[f.sku] ?? null : null })), [template, bySku])
  const shoppable = pieces.filter((p) => p.product)
  const total = pieces.reduce((s, p) => s + (p.product ? productPrice(p.product) ?? p.price : p.price), 0)

  if (!template) return <Shell><p className="text-sm">Template not found. <Link href="/templates" className="underline">Back to templates</Link></p></Shell>

  const addAll = async () => {
    let ok = 0
    for (const p of shoppable) {
      const v = p.product!.variants?.[0]
      if (v && (await add(v.id, 1))) ok += 1
    }
    if (ok > 0) toast.success(`${ok} item${ok === 1 ? '' : 's'} added to cart`)
  }

  return (
    <Shell wide>
      <p className="text-xs text-[#8E8E8E] mb-4"><Link href="/templates">Templates</Link> / {template.name}</p>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl" style={{ fontFamily: "'Henry Trial', serif" }}>{template.name}</h1>
          <p className="text-sm text-[#4B4B4B] mt-1">{template.style} · {template.room} · {pieces.length} pieces · about {formatPrice(total)}</p>
        </div>
        {shoppable.length > 0 ? (
          <Button onClick={addAll} disabled={busy}>Add {shoppable.length} available pieces to cart</Button>
        ) : (
          <p className="text-xs text-[#8E8E8E]">These pieces aren&apos;t in the catalog yet — showcase only.</p>
        )}
      </div>
      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={template.image} alt={template.name} className="w-full aspect-[4/3] object-cover" />
        </div>
        <aside className="lg:col-span-4">
          <h2 className="text-lg mb-3" style={{ fontFamily: "'Henry Trial', serif" }}>Furniture in this room</h2>
          <ul className="divide-y divide-[#e8e4dc]">
            {pieces.map((p) => (
              <li key={p.id} className="py-3 flex gap-3">
                <div className="w-16 h-16 bg-[#F5F4F0] shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.product ? productImage(p.product) || p.image : p.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{p.product?.title ?? p.name}</p>
                  <p className="text-xs text-[#4B4B4B]">{formatPrice(p.product ? productPrice(p.product) : p.price)}{!p.product && <span className="ml-2 text-[#8E8E8E]">showcase</span>}</p>
                  {p.product && (
                    <div className="flex gap-3 mt-1 text-xs">
                      <Link href={`/shop/${p.product.handle}`} className="underline">View</Link>
                      <button disabled={busy} onClick={() => p.product!.variants?.[0] && add(p.product!.variants[0].id, 1)} className="underline">Add to cart</button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </Shell>
  )
}
