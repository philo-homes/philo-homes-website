'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { SlidersHorizontal, X } from 'lucide-react'
import Shell from '@/components/Shell'
import ProductCard from '@/components/ProductCard'
import { Button } from '@/components/Section'
import { catalog, HistoryItem, listProducts, Product, readHistory } from '@/lib/medusa'
import { STORE_CATEGORIES } from '@/lib/templates'
import SaleBanner from '@/components/SaleBanner'
import { Deal, pickDeals } from '@/lib/catalog'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import { formatPrice } from '@/lib/format'
import {
  applyFilters, COLOR_FILTERS, EMPTY_FILTERS, FilterState, MATERIAL_FILTERS, PRICE_BUCKETS, productCategory, SORT_OPTIONS, STYLE_FILTERS,
} from '@/lib/catalog'

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 text-xs border transition-colors ${selected ? 'bg-[#10182B] text-white border-[#10182B]' : 'border-[#e1e1e1] hover:border-[#10182B]'}`}>
      {label}
    </button>
  )
}

function ShopInner() {
  const params = useSearchParams()
  const q = params.get('q') ?? ''
  const [products, setProducts] = useState<Product[]>([])
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [panel, setPanel] = useState(false)
  const [loading, setLoading] = useState(true)
  const { customer } = useAuth()
  const recentlyViewed: HistoryItem[] = useMemo(() => readHistory(customer).slice(0, 8), [customer])
  // Deals come from the same catalog load (no second request).
  const deals: Deal[] = useMemo(() => (q ? [] : pickDeals(products)), [products, q])

  useEffect(() => {
    setLoading(true)
    ;(q ? listProducts({ q }) : catalog()).then(setProducts).catch(() => setProducts([])).finally(() => setLoading(false))
  }, [q])

  // Only the categories present in the current result set (same as the app).
  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => { const c = productCategory(p); if (c) set.add(c) })
    return Array.from(set).sort()
  }, [products])

  const results = useMemo(() => applyFilters(products, filters), [products, filters])
  const toggle = (key: 'materials' | 'colors' | 'categories' | 'styles', value: string) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }))

  const activeChips: { label: string; clear: () => void }[] = []
  if (filters.priceRange) activeChips.push({ label: PRICE_BUCKETS.find((b) => b.id === filters.priceRange)!.label, clear: () => setFilters((f) => ({ ...f, priceRange: '' })) })
  for (const key of ['categories', 'materials', 'colors', 'styles'] as const) for (const v of filters[key]) activeChips.push({ label: v, clear: () => toggle(key, v) })
  const activeCount = activeChips.length + (filters.sort !== 'best-match' ? 1 : 0)

  return (
    <>
      {!q && (
        <section className="mb-10">
          {/* Category tiles + quick shelves, as on the app's Store tab */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mb-6">
            {STORE_CATEGORIES.map((c) => (
              <Link key={c.name} href={`/shop?q=${encodeURIComponent(c.q)}`} className="text-center text-xs py-3 border border-[#e8e4dc] hover:border-[#D1903E] hover:text-[#D1903E]">{c.name}</Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <a href="#deals" className="px-3 py-1.5 bg-[#E5C68C]/60 hover:bg-[#E5C68C]">Special Deals</a>
            <button onClick={() => setFilters({ ...EMPTY_FILTERS, sort: 'price-high-low' })} className="px-3 py-1.5 bg-[#F5F4F0] hover:bg-[#EEEEEE]">Premium Collection</button>
            <button onClick={() => setFilters({ ...EMPTY_FILTERS, sort: 'best-match' })} className="px-3 py-1.5 bg-[#F5F4F0] hover:bg-[#EEEEEE]">Fresh Arrivals</button>
            <Link href="/templates" className="px-3 py-1.5 bg-[#F5F4F0] hover:bg-[#EEEEEE]">Room Templates</Link>
          </div>
          {recentlyViewed.length > 0 && (
            <div className="mt-8">
              <p className="text-xs uppercase tracking-wider text-[#8E8E8E] mb-3">Recently viewed</p>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {recentlyViewed.map((h) => (
                  <Link key={h.id} href={`/shop/${h.id}`} className="w-28 shrink-0">
                    <div className="aspect-square bg-[#F5F4F0] overflow-hidden">
                      {h.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={h.image} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <p className="text-xs mt-1 truncate">{h.name}</p>
                    <p className="text-xs text-[#4B4B4B]">{formatPrice(h.price)}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
      {!q && !loading && <SaleBanner deals={deals} />}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl" style={{ fontFamily: "'Henry Trial', serif" }}>{q ? `Results for “${q}”` : 'All products'}</h1>
          <p className="text-sm text-[#4B4B4B] mt-1">{loading ? 'Loading…' : `${results.length} of ${products.length} products`}</p>
        </div>
        <div className="flex gap-3 text-sm">
          <select value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as any }))} className="border border-[#e1e1e1] px-3 py-2 bg-white">
            {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <Button variant="outline" onClick={() => setPanel(true)}><SlidersHorizontal size={16} className="mr-2" /> Filters{activeCount ? ` (${activeCount})` : ''}</Button>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {activeChips.map((c) => (
            <button key={c.label} onClick={c.clear} className="flex items-center gap-1 px-3 py-1 text-xs bg-[#F5F4F0] hover:bg-[#EEEEEE]">{c.label} <X size={12} /></button>
          ))}
          <button onClick={() => setFilters(EMPTY_FILTERS)} className="text-xs underline text-[#4B4B4B]">Clear all</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square bg-[#F5F4F0] animate-pulse" />)}</div>
      ) : results.length === 0 ? (
        <p className="text-sm text-[#4B4B4B]">Nothing matched. Try another search or clear the filters.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">{results.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      )}

      {panel && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={() => setPanel(false)}>
          <div className="bg-white w-full max-w-sm h-full overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg" style={{ fontFamily: "'Henry Trial', serif" }}>Filters</h2>
              <button onClick={() => setPanel(false)} aria-label="Close"><X size={20} /></button>
            </div>
            <Group title="Sort by">{SORT_OPTIONS.map((o) => <Chip key={o.id} label={o.label} selected={filters.sort === o.id} onClick={() => setFilters((f) => ({ ...f, sort: o.id }))} />)}</Group>
            <Group title="Price">{PRICE_BUCKETS.map((b) => <Chip key={b.id} label={b.label} selected={filters.priceRange === b.id} onClick={() => setFilters((f) => ({ ...f, priceRange: f.priceRange === b.id ? '' : b.id }))} />)}</Group>
            {availableCategories.length > 0 && <Group title="Category">{availableCategories.map((c) => <Chip key={c} label={c} selected={filters.categories.includes(c)} onClick={() => toggle('categories', c)} />)}</Group>}
            <Group title="Material">{MATERIAL_FILTERS.map((m) => <Chip key={m} label={m} selected={filters.materials.includes(m)} onClick={() => toggle('materials', m)} />)}</Group>
            <Group title="Color">{COLOR_FILTERS.map((c) => <Chip key={c} label={c} selected={filters.colors.includes(c)} onClick={() => toggle('colors', c)} />)}</Group>
            <Group title="Style">{STYLE_FILTERS.map((s) => <Chip key={s} label={s} selected={filters.styles.includes(s)} onClick={() => toggle('styles', s)} />)}</Group>
            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={() => setFilters(EMPTY_FILTERS)} className="flex-1">Reset</Button>
              <Button onClick={() => setPanel(false)} className="flex-1">Show {results.length} results</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-wider text-[#8E8E8E] mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
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
