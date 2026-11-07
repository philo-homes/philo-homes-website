'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Heart, Share2, Star } from 'lucide-react'
import Shell from '@/components/Shell'
import { Button } from '@/components/Section'
import { getProductByHandle, getProductById, getReviews, Product, productImage, productPrice, recordView, ReviewSummary } from '@/lib/medusa'
import { useAuth } from '@/context/AuthContext'
import { toast } from '@/components/Toast'
import { normalizeMaterial } from '@/lib/catalog'
import { formatPrice, formatDate } from '@/lib/format'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'

export default function ProductPage() {
  const { handle } = useParams<{ handle: string }>()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null | undefined>(undefined)
  const [reviews, setReviews] = useState<ReviewSummary | null>(null)
  const [image, setImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const { add, busy } = useCart()
  const { has, toggle } = useWishlist()
  const { customer } = useAuth()

  useEffect(() => {
    // Links from the app/history carry a product id; the shop uses handles.
    const load = handle.startsWith('prod_') ? getProductById(handle) : getProductByHandle(handle)
    load.then((p) => {
      setProduct(p)
      if (p) getReviews(p.id).then(setReviews)
    })
  }, [handle])

  // Recently viewed, shared with the app through the account.
  useEffect(() => {
    if (product && customer) {
      recordView(customer, { id: product.id, name: product.title, image: productImage(product), price: productPrice(product) ?? 0 }).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, customer?.id])

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (navigator.share) await navigator.share({ title: product?.title, text: `Check out this ${product?.title} from Philo Homes!`, url })
      else {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied')
      }
    } catch {
      // user dismissed the share sheet
    }
  }

  if (product === undefined) return <Shell><p className="text-sm">Loading…</p></Shell>
  if (!product) return <Shell><p className="text-sm">Product not found. <Link href="/shop" className="underline">Back to shop</Link></p></Shell>

  const price = productPrice(product)
  const variant = product.variants?.[0]
  const liked = has(product.id)

  const onAdd = async () => {
    if (!variant) return
    if (!(await add(variant.id, qty))) return
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <Shell wide>
      <p className="text-xs text-[#8E8E8E] mb-6"><Link href="/shop">Shop</Link> / {product.collection?.title ?? 'Furniture'} / {product.title}</p>
      <div className="grid md:grid-cols-12 gap-10">
        <div className="md:col-span-1 flex md:flex-col gap-2 order-2 md:order-1">
          {product.images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={img.id} src={img.url} alt="" onClick={() => setImage(i)} className={`w-16 h-16 object-cover cursor-pointer border ${i === image ? 'border-[#D1903E]' : 'border-transparent'}`} />
          ))}
        </div>
        <div className="md:col-span-6 order-1 md:order-2 bg-[#F5F4F0] aspect-square md:sticky md:top-32">
          {product.images[image] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.images[image].url} alt={product.title} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="md:col-span-5 order-3">
          <h1 className="text-2xl" style={{ fontFamily: "'Henry Trial', serif" }}>{product.title}</h1>
          {product.subtitle && <p className="text-sm text-[#4B4B4B] mt-1">{product.subtitle}</p>}
          <p className="text-xl mt-3">{formatPrice(price)}</p>
          {reviews && reviews.stats.count > 0 && (
            <p className="text-xs text-[#4B4B4B] mt-1 flex items-center gap-1">
              <Star size={12} className="fill-[#D1903E] text-[#D1903E]" /> {reviews.stats.average.toFixed(1)} · {reviews.stats.count} reviews
            </p>
          )}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex border border-[#e1e1e1]">
              <button onClick={() => setQty((n) => Math.max(1, n - 1))} className="px-3 py-2">−</button>
              <span className="px-3 py-2 text-sm">{qty}</span>
              <button onClick={() => setQty((n) => n + 1)} className="px-3 py-2">+</button>
            </div>
            <Button onClick={onAdd} disabled={busy || !variant} className="flex-1">{added ? 'Added ✓' : 'Add to cart'}</Button>
            <button onClick={async () => { if ((await toggle(product)) === 'sign-in') router.push(`/login?next=/shop/${handle}`) }} className="w-11 h-11 border border-[#e1e1e1] flex items-center justify-center" aria-label="Favorite">
              <Heart size={18} className={liked ? 'fill-[#D1903E] text-[#D1903E]' : ''} />
            </button>
            <button onClick={share} className="w-11 h-11 border border-[#e1e1e1] flex items-center justify-center" aria-label="Share">
              <Share2 size={18} />
            </button>
          </div>
          {(product.material || product.length || product.weight) && (
            <dl className="mt-8 text-sm grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
              {product.material && <><dt className="text-[#8E8E8E]">Material</dt><dd>{normalizeMaterial(product.material) === 'Other' ? product.material.replace(/^\s*\d+\s*/, '') : normalizeMaterial(product.material)}</dd></>}
              {product.length && product.width && product.height && (
                <><dt className="text-[#8E8E8E]">Dimensions</dt><dd>{product.length} × {product.width} × {product.height} cm</dd></>
              )}
              {product.weight && <><dt className="text-[#8E8E8E]">Weight</dt><dd>{product.weight} kg</dd></>}
            </dl>
          )}
          {product.description && <p className="text-sm text-[#4B4B4B] leading-relaxed mt-8 whitespace-pre-line">{product.description}</p>}
          {variant?.sku && <p className="text-xs text-[#8E8E8E] mt-6">SKU {variant.sku}</p>}

          <div className="mt-10 border-t border-[#e8e4dc] pt-6">
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Henry Trial', serif" }}>Reviews</h2>
            <p className="text-xs text-[#8E8E8E] mb-4">Only customers who purchased this product can leave a review.</p>
            {!reviews || reviews.reviews.length === 0 ? (
              <p className="text-sm text-[#4B4B4B]">No reviews yet — be the first to review after your purchase.</p>
            ) : (
              <ul className="space-y-4">
                {reviews.reviews.map((r) => (
                  <li key={r.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} className={i < r.rating ? 'fill-[#D1903E] text-[#D1903E]' : 'text-[#CACACA]'} />)}</span>
                      <span className="text-[#4B4B4B]">{r.is_mine ? 'You' : r.display_name}</span>
                      <span className="text-xs text-[#8E8E8E]">{formatDate(r.created_at)}</span>
                    </div>
                    {r.content && <p className="mt-1 text-[#4B4B4B]">{r.content}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Shell>
  )
}
