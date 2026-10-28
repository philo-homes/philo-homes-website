'use client'

import Link from 'next/link'
import Shell from '@/components/Shell'
import { Button } from '@/components/Section'
import { useCart } from '@/context/CartContext'
import { formatPrice } from '@/lib/format'
import { useRouter } from 'next/navigation'

export default function CartPage() {
  const { cart, update, remove, busy, count } = useCart()
  const router = useRouter()
  const items = cart?.items ?? []

  return (
    <Shell>
      <h1 className="text-3xl mb-8" style={{ fontFamily: "'Henry Trial', serif" }}>Cart ({count} {count === 1 ? 'item' : 'items'})</h1>
      {items.length === 0 ? (
        <p className="text-sm text-[#4B4B4B]">Your cart is empty. <Link href="/shop" className="underline">Browse the shop</Link>.</p>
      ) : (
        <div className="grid md:grid-cols-12 gap-10">
          <ul className="md:col-span-8 divide-y divide-[#e8e4dc]">
            {items.map((li) => (
              <li key={li.id} className="py-4 flex gap-4">
                <div className="w-24 h-24 bg-[#F5F4F0] shrink-0">
                  {li.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={li.thumbnail} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{li.product_title ?? li.title}</p>
                  <p className="text-xs text-[#4B4B4B]">{li.title}</p>
                  <p className="text-sm mt-1">{formatPrice(li.unit_price)}</p>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <div className="flex border border-[#e1e1e1]">
                      <button disabled={busy} onClick={() => update(li.id, li.quantity - 1)} className="px-2 py-1">−</button>
                      <span className="px-2 py-1">{li.quantity}</span>
                      <button disabled={busy} onClick={() => update(li.id, li.quantity + 1)} className="px-2 py-1">+</button>
                    </div>
                    <button disabled={busy} onClick={() => remove(li.id)} className="text-xs text-[#8E8E8E] hover:text-red-600">Remove</button>
                  </div>
                </div>
                <p className="text-sm">{formatPrice(li.unit_price * li.quantity)}</p>
              </li>
            ))}
          </ul>
          <aside className="md:col-span-4 bg-[#FCF9F2] p-6 h-fit">
            <h2 className="text-lg mb-4" style={{ fontFamily: "'Henry Trial', serif" }}>Cart Summary</h2>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(cart?.subtotal ?? null)}</dd></div>
              <div className="flex justify-between"><dt>Shipping</dt><dd>{cart?.shipping_total ? formatPrice(cart.shipping_total) : 'Calculated at checkout'}</dd></div>
              <div className="flex justify-between"><dt>Estimated tax</dt><dd>{formatPrice(cart?.tax_total ?? 0)}</dd></div>
              <div className="flex justify-between border-t border-[#e8e4dc] pt-2 font-medium"><dt>Estimated total</dt><dd>{formatPrice(cart?.total ?? null)}</dd></div>
            </dl>
            <Button className="w-full mt-6" onClick={() => router.push('/checkout')}>Checkout</Button>
          </aside>
        </div>
      )}
    </Shell>
  )
}
