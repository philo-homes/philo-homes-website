'use client'

import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import ProductCard from '@/components/ProductCard'
import { catalog, Product } from '@/lib/medusa'
import { Deal, pickDeals } from '@/lib/catalog'

// Mirrors the app's Deals tab: real sale prices when a price list is active,
// otherwise the same stable demo shelf, biggest discount first.
export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[] | null>(null)

  useEffect(() => {
    catalog().then((products: Product[]) => setDeals(pickDeals(products))).catch(() => setDeals([]))
  }, [])

  return (
    <Shell wide>
      <div className="-mx-5 md:-mx-10 -mt-10 mb-10 bg-[#E5C68C]/70 py-12 text-center">
        <h1 className="text-3xl" style={{ fontFamily: "'Henry Trial', serif" }}>Limited-Time Deals</h1>
        <p className="text-sm text-[#4B4B4B] mt-2">{deals ? `${deals.length} products` : 'Loading…'} · prices shown are what you pay at checkout</p>
      </div>
      {deals === null ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square bg-[#F5F4F0] animate-pulse" />)}</div>
      ) : deals.length === 0 ? (
        <p className="text-sm text-[#4B4B4B]">No deals available right now. Check back soon!</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {deals.map((d) => <ProductCard key={d.product.id} product={d.product} original={d.original} />)}
        </div>
      )}
    </Shell>
  )
}
