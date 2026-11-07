'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Star } from 'lucide-react'
import Shell from '@/components/Shell'
import { Button } from '@/components/Section'
import { toast } from '@/components/Toast'
import { useAuth } from '@/context/AuthContext'
import { getOrder, submitReview } from '@/lib/medusa'
import { formatDate, formatPrice } from '@/lib/format'
import { orderStatusColor, orderStatusLabel } from '@/lib/orders'

// Full detail for one order, like the app's OrderDetailScreen: status, items
// (each ratable, with an optional comment), totals and the delivery address.
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { customer, loading } = useAuth()
  const [order, setOrder] = useState<any | null | undefined>(undefined)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [commenting, setCommenting] = useState<string | null>(null)
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (!customer) return
    getOrder(id).then(setOrder).catch(() => setOrder(null))
  }, [customer, id])

  if (loading) return <Shell><p className="text-sm">Loading…</p></Shell>
  if (!customer) return <Shell><p className="text-sm"><Link href={`/login?next=/account/orders/${id}`} className="underline">Sign in</Link> to see this order.</p></Shell>
  if (order === undefined) return <Shell><p className="text-sm">Loading…</p></Shell>
  if (!order) return <Shell><p className="text-sm">Order not found. <Link href="/account" className="underline">Back to account</Link></p></Shell>

  const label = orderStatusLabel(order)
  const color = orderStatusColor(label)
  const addr = order.shipping_address

  const rate = async (productId: string, rating: number, content?: string) => {
    setRatings((r) => ({ ...r, [productId]: rating }))
    try {
      await submitReview({ product_id: productId, rating, content })
      toast.success(content ? 'Thanks! Your review was posted.' : 'Thanks! Your rating was submitted.')
      setCommenting(null)
      setComment('')
    } catch (err: any) {
      setRatings((r) => { const n = { ...r }; delete n[productId]; return n })
      toast.error(err?.status === 404 ? 'Ratings are not available on this server yet.' : err?.message || 'Could not submit.')
    }
  }

  return (
    <Shell>
      <p className="text-xs text-[#8E8E8E] mb-4"><Link href="/account">Account</Link> / Orders / #{order.display_id}</p>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl" style={{ fontFamily: "'Henry Trial', serif" }}>Order #{order.display_id}</h1>
          <p className="text-sm text-[#4B4B4B] mt-1">Placed {formatDate(order.created_at)}</p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs px-3 py-1" style={{ color, backgroundColor: `${color}1A` }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} /> {label}
        </span>
      </div>

      <div className="grid md:grid-cols-12 gap-10">
        <section className="md:col-span-7">
          <h2 className="text-lg mb-3" style={{ fontFamily: "'Henry Trial', serif" }}>Items</h2>
          <ul className="divide-y divide-[#e8e4dc]">
            {(order.items ?? []).map((it: any) => {
              const pid = it.product_id ?? it.variant?.product_id
              const r = pid ? ratings[pid] ?? 0 : 0
              return (
                <li key={it.id} className="py-4">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 bg-[#F5F4F0] shrink-0">
                      {it.thumbnail && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.thumbnail} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 text-sm">
                      <p>{it.product_title ?? it.title}</p>
                      <p className="text-xs text-[#8E8E8E]">{it.variant_title && it.variant_title !== it.product_title ? `${it.variant_title} · ` : ''}× {it.quantity}</p>
                      <p className="mt-1">{formatPrice((it.unit_price ?? 0) * (it.quantity ?? 1))}</p>
                    </div>
                  </div>
                  {pid && (
                    <div className="mt-3 pl-[76px] text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[#4B4B4B]">Rate it:</span>
                        <span className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <button key={i} onClick={() => rate(pid, i + 1)} aria-label={`${i + 1} stars`}>
                              <Star size={16} className={i < r ? 'fill-[#D1903E] text-[#D1903E]' : 'text-[#CACACA]'} />
                            </button>
                          ))}
                        </span>
                        {r > 0 && commenting !== pid && <button onClick={() => setCommenting(pid)} className="underline ml-2">Add a comment (optional)</button>}
                      </div>
                      {commenting === pid && (
                        <div className="mt-2 flex gap-2">
                          <input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} placeholder="What did you think?" className="flex-1 border border-[#e1e1e1] px-2 py-1" />
                          <Button variant="outline" className="!py-1" onClick={() => rate(pid, r, comment.trim() || undefined)}>Post</Button>
                          <button onClick={() => { setCommenting(null); setComment('') }} className="underline">Cancel</button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="text-[11px] text-[#8E8E8E] mt-3">Only purchased items can be rated. Your review appears on the product page.</p>
        </section>
        <aside className="md:col-span-5 space-y-6">
          <div className="bg-[#FCF9F2] p-5">
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Henry Trial', serif" }}>Summary</h2>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between"><dt>Items</dt><dd>{formatPrice(order.item_subtotal ?? order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Shipping</dt><dd>{formatPrice(order.shipping_total ?? 0)}</dd></div>
              <div className="flex justify-between"><dt>Tax</dt><dd>{formatPrice(order.tax_total ?? 0)}</dd></div>
              {order.discount_total ? <div className="flex justify-between"><dt>Discount</dt><dd>−{formatPrice(order.discount_total)}</dd></div> : null}
              <div className="flex justify-between font-medium border-t border-[#e8e4dc] pt-2"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
            </dl>
            <p className="text-xs text-[#8E8E8E] mt-3">Payment: {order.payment_status ?? '—'} · Fulfillment: {order.fulfillment_status ?? '—'}</p>
          </div>
          {addr && (addr.address_1 || addr.city) && (
            <div className="border border-[#e8e4dc] p-5 text-sm">
              <h2 className="text-lg mb-2" style={{ fontFamily: "'Henry Trial', serif" }}>Delivery address</h2>
              <p>{addr.first_name} {addr.last_name}</p>
              <p className="text-[#4B4B4B]">{addr.address_1}{addr.address_2 ? `, ${addr.address_2}` : ''}</p>
              <p className="text-[#4B4B4B]">{addr.city}, {addr.province} {addr.postal_code}</p>
              {addr.phone && <p className="text-[#4B4B4B]">{addr.phone}</p>}
            </div>
          )}
        </aside>
      </div>
    </Shell>
  )
}
