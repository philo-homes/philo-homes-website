'use client'

import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Product, productImage, productPrice } from '@/lib/medusa'
import { formatPrice } from '@/lib/format'
import { useWishlist } from '@/context/WishlistContext'
import { useCart } from '@/context/CartContext'

export default function ProductCard({ product, badge }: { product: Product; badge?: string }) {
  const { has, toggle } = useWishlist()
  const { add, busy } = useCart()
  const router = useRouter()
  const price = productPrice(product)
  const image = productImage(product)
  const liked = has(product.id)

  const onHeart = async (e: React.MouseEvent) => {
    e.preventDefault()
    const r = await toggle(product)
    if (r === 'sign-in') router.push('/login?next=/shop')
  }
  const onAdd = async (e: React.MouseEvent) => {
    e.preventDefault()
    const variant = product.variants?.[0]
    if (!variant) return
    await add(variant.id, 1)
  }

  return (
    <Link href={`/shop/${product.handle}`} className="group block">
      <div className="relative aspect-square bg-[#F5F4F0] overflow-hidden">
        {badge && <span className="absolute top-2 left-2 z-10 text-[10px] uppercase tracking-wider bg-white/90 px-2 py-0.5">{badge}</span>}
        <button onClick={onHeart} aria-label="Favorite" className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:scale-105">
          <Heart size={16} className={liked ? 'fill-[#D1903E] text-[#D1903E]' : 'text-[#10182B]'} />
        </button>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={product.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-[#8E8E8E]">No image</div>
        )}
        <button onClick={onAdd} disabled={busy} className="absolute bottom-2 left-2 right-2 bg-[#10182B] text-white text-xs py-2 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50">
          Add to cart
        </button>
      </div>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm leading-snug">{product.title}</p>
          <p className="text-sm text-[#4B4B4B]">{formatPrice(price)}</p>
        </div>
      </div>
    </Link>
  )
}
