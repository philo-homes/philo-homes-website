/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Product } from './medusa'
import { productPrice } from './medusa'

// =============================================================================
// Catalog rules copied from the app (src/services/productCategories.ts and
// src/components/FilterPanel.tsx) so the website shows the SAME deals, prices
// and filter buckets as the phone.
// =============================================================================

// Real discount first (sale price list: original_amount > calculated_amount);
// otherwise a 'sale' tag/collection is a deal with an approximated original.
export function originalPrice(p: Product): number | undefined {
  const cp: any = p.variants?.[0]?.calculated_price
  const price = productPrice(p)
  if (price === null) return undefined
  if (typeof cp?.original_amount === 'number' && cp.original_amount > cp.calculated_amount) return cp.original_amount
  const tagged = p.collection?.handle === 'sale' || p.tags?.some((t) => t.value === 'sale')
  return tagged ? Math.round(price * 1.2) : undefined
}

export function discountPercent(price: number | null, original?: number): number {
  if (price === null || !original || original <= price) return 0
  return (original - price) / original
}

// Deterministic per-product hash so demo deals stay stable (same as the app).
export function hashProductId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 100003
  return hash
}
const DEMO_DEAL_DISCOUNTS = [15, 20, 25, 30]

export type Deal = { product: Product; price: number; original: number; percent: number }

// Same picker as the app's getLimitedTimeProducts: real deals if any exist,
// otherwise a stable demo shelf (display only — checkout charges real prices).
export function pickDeals(products: Product[], limit = Infinity): Deal[] {
  const withPrice = products.filter((p) => (productPrice(p) ?? 0) > 0)
  const real = withPrice.filter((p) => originalPrice(p) !== undefined || p.tags?.some((t) => t.value === 'sale' || t.value === 'limited-time'))
  let picked: Product[]
  let demo = false
  if (real.length > 0) {
    picked = real.slice(0, limit)
  } else {
    demo = true
    const candidates = withPrice.slice(8)
    picked = candidates.filter((p) => hashProductId(p.id) % 3 === 0).slice(0, 8)
    for (const p of candidates) {
      if (picked.length >= 4) break
      if (!picked.includes(p)) picked.push(p)
    }
  }
  const deals = picked.map((product) => {
    const price = productPrice(product) ?? 0
    const original = demo
      ? Math.round(price / (1 - DEMO_DEAL_DISCOUNTS[hashProductId(product.id) % DEMO_DEAL_DISCOUNTS.length] / 100))
      : originalPrice(product) ?? Math.round(price * 1.2)
    return { product, price, original, percent: discountPercent(price, original) }
  })
  return deals.sort((a, b) => b.percent - a.percent)
}

// ---- Filters (identical buckets/labels to the app's FilterPanel) -----------

export const SORT_OPTIONS = [
  { id: 'best-match', label: 'Best Match' },
  { id: 'price-low-high', label: 'Price: Low to High' },
  { id: 'price-high-low', label: 'Price: High to Low' },
] as const
export type SortId = (typeof SORT_OPTIONS)[number]['id']

export const PRICE_BUCKETS = [
  { id: 'under-500', label: 'Under $500', min: 0, max: 500 },
  { id: '500-1000', label: '$500 – $1,000', min: 500, max: 1000 },
  { id: '1000-2000', label: '$1,000 – $2,000', min: 1000, max: 2000 },
  { id: 'over-2000', label: 'Over $2,000', min: 2000, max: Infinity },
]
export const MATERIAL_FILTERS = ['Wood', 'Metal', 'Stone', 'Other']
export const COLOR_FILTERS = ['Neutral', 'Warm Colors', 'Cool Colors', 'Black or White Tones']
export const STYLE_FILTERS = ['Modern', 'Traditional']

export function normalizeMaterial(raw?: string | null): string {
  if (!raw) return 'Other'
  const cleaned = raw.replace(/^\s*\d+\s*/, '').trim()
  if (!cleaned) return 'Other'
  const canon = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
  return MATERIAL_FILTERS.includes(canon) ? canon : 'Other'
}

// Prettified category name present on the product ("bedroom-furniture" -> "Bedroom Furniture").
export function productCategory(p: Product): string | null {
  const name = p.categories?.[0]?.name ?? p.collection?.title ?? null
  if (!name) return null
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const WARM = ['red', 'orange', 'yellow', 'brown', 'tan', 'beige', 'gold', 'terracotta', 'rust', 'walnut', 'oak', 'cherry']
const COOL = ['blue', 'green', 'teal', 'navy', 'grey', 'gray', 'silver', 'purple']
const BW = ['black', 'white', 'charcoal', 'ivory', 'cream']
export function colorFamily(p: Product): string {
  const option = (p as any).options?.find((o: any) => String(o?.title ?? '').toLowerCase() === 'color')
  const values: string[] = (option?.values ?? []).map((v: any) => String(v?.value ?? '').toLowerCase())
  const text = [...values, p.title.toLowerCase()].join(' ')
  if (BW.some((w) => text.includes(w))) return 'Black or White Tones'
  if (WARM.some((w) => text.includes(w))) return 'Warm Colors'
  if (COOL.some((w) => text.includes(w))) return 'Cool Colors'
  return 'Neutral'
}

export function productStyle(p: Product): string | null {
  const text = [p.title, ...(p.tags ?? []).map((t) => t.value), String((p as any).metadata?.style ?? '')].join(' ').toLowerCase()
  if (text.includes('modern') || text.includes('minimal') || text.includes('scandinav')) return 'Modern'
  if (text.includes('traditional') || text.includes('classic') || text.includes('vintage') || text.includes('american')) return 'Traditional'
  return null
}

export type FilterState = {
  sort: SortId
  priceRange: string
  materials: string[]
  colors: string[]
  categories: string[]
  styles: string[]
}
export const EMPTY_FILTERS: FilterState = { sort: 'best-match', priceRange: '', materials: [], colors: [], categories: [], styles: [] }

export function applyFilters(products: Product[], f: FilterState): Product[] {
  let list = products
  if (f.priceRange) {
    const b = PRICE_BUCKETS.find((x) => x.id === f.priceRange)
    if (b) list = list.filter((p) => { const v = productPrice(p) ?? 0; return v >= b.min && v < b.max })
  }
  if (f.materials.length) list = list.filter((p) => f.materials.includes(normalizeMaterial((p as any).material)))
  if (f.colors.length) list = list.filter((p) => f.colors.includes(colorFamily(p)))
  if (f.categories.length) list = list.filter((p) => { const c = productCategory(p); return !!c && f.categories.includes(c) })
  if (f.styles.length) list = list.filter((p) => { const s = productStyle(p); return !!s && f.styles.includes(s) })
  if (f.sort === 'price-low-high') list = [...list].sort((a, b) => (productPrice(a) ?? 0) - (productPrice(b) ?? 0))
  if (f.sort === 'price-high-low') list = [...list].sort((a, b) => (productPrice(b) ?? 0) - (productPrice(a) ?? 0))
  return list
}
