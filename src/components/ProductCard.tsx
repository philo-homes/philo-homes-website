'use client'

import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Product, productImage, productPrice } from '@/lib/medusa'
import { formatPrice } from '@/lib/format'
import { useWishlist } from '@/context/WishlistContext'
import { useCart } from '@/context/CartContext'
import { discountPercent, originalPrice as originalPriceOf } from '@/lib/catalog'
import Img from './Img'

// `original` overrides the catalog rule (used by the deals shelf, which
// assigns stable demo discounts the same way the app does).
export default function ProductCard({ product, badge, original }: { product: Product; badge?: string; original?: number }) {
  const { has, toggle } = useWishlist()
  const { add, busy } = useCart()
  const router = useRouter()
  const [added, setAdded] = useState(false)
  const price = productPrice(product)
  const image = productImage(product)
  const liked = has(product.id)
  const orig = original ?? originalPriceOf(product)
  const pct = discountPercent(price, orig)
  const href = `/shop/${product.handle}`

  const onHeart = async () => {
    const r = await toggle(product)
    if (r === 'sign-in') router.push(`/login?next=${encodeURIComponent(href)}`)
  }
  const onAdd = async () => {
    const variant = product.variants?.[0]
    if (!variant) return
    if (!(await add(variant.id, 1))) return
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className="group">
      <div className="relative aspect-square bg-[#F5F4F0] overflow-hidden">
        <Link href={href} className="absolute inset-0 block" aria-label={product.title}>
          {image ? (
            <Img src={image} alt={product.title} className="group-hover:scale-[1.03] transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-[#8E8E8E]">No image</div>
          )}
        </Link>
        {(badge || pct > 0) && (
          <span className={`absolute top-2 left-2 z-10 text-[10px] uppercase tracking-wider px-2 py-0.5 pointer-events-none ${pct > 0 ? 'bg-[#D1903E] text-white' : 'bg-white/90'}`}>
            {pct > 0 ? `-${Math.round(pct * 100)}%` : badge}
          </span>
        )}
        <button type="button" onClick={onHeart} aria-label={liked ? 'Remove from favorites' : 'Add to favorites'} className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:scale-105">
          <Heart size={16} className={liked ? 'fill-[#D1903E] text-[#D1903E]' : 'text-[#10182B]'} />
        </button>
        <button type="button" onClick={onAdd} disabled={busy} className="absolute bottom-2 left-2 right-2 z-10 bg-[#10182B] text-white text-xs py-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-50">
          {added ? 'Added ✓' : 'Add to cart'}
        </button>
      </div>
      <Link href={href} className="block mt-2">
        <p className="text-sm leading-snug">{product.title}</p>
        <p className="text-sm text-[#4B4B4B]">
          {formatPrice(price)}
          {orig && pct > 0 && <span className="ml-2 line-through text-[#8E8E8E] text-xs">{formatPrice(orig)}</span>}
        </p>
      </Link>
    </div>
  )
}
