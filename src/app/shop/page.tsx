'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Shell from '@/components/Shell'
import ProductCard from '@/components/ProductCard'
import { listCollections, listProducts, Product } from '@/lib/medusa'

function ShopInner() {
  const params = useSearchParams()
  const q = params.get('q') ?? ''
  const [products, setProducts] = useState<Product[]>([])
  const [collections, setCollections] = useState<{ id: string; title: string }[]>([])
  const [collection, setCollection] = useState<string>('')
  const [sort, setSort] = useState<'featured' | 'price-asc' | 'price-desc'>('featured')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listCollections().then(setCollections)
  }, [])

  useEffect(() => {
    setLoading(true)
    listProducts({ q: q || undefined, collection_id: collection || undefined })
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [q, collection])

  const sorted = useMemo(() => {
    const price = (p: Product) => p.variants?.[0]?.calculated_price?.calculated_amount ?? 0
    if (sort === 'price-asc') return [...products].sort((a, b) => price(a) - price(b))
    if (sort === 'price-desc') return [...products].sort((a, b) => price(b) - price(a))
    return products
  }, [products, sort])

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl" style={{ fontFamily: "'Henry Trial', serif" }}>{q ? `Results for “${q}”` : 'Shop'}</h1>
          <p className="text-sm text-[#4B4B4B] mt-1">{loading ? 'Loading…' : `${sorted.length} products`}</p>
        </div>
        <div className="flex gap-3 text-sm">
          {collections.length > 0 && (
            <select value={collection} onChange={(e) => setCollection(e.target.value)} className="border border-[#e1e1e1] px-3 py-2 bg-white">
              <option value="">All collections</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          )}
          <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="border border-[#e1e1e1] px-3 py-2 bg-white">
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square bg-[#F5F4F0] animate-pulse" />)}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-[#4B4B4B]">Nothing matched. Try another search.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {sorted.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </>
  )
}

export default function ShopPage() {
  return (
    <Shell wide>
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <ShopInner />
      </Suspense>
    </Shell>
  )
}
