'use client'

import Link from 'next/link'
import Shell from '@/components/Shell'
import { useAuth } from '@/context/AuthContext'
import { useWishlist } from '@/context/WishlistContext'
import { formatPrice } from '@/lib/format'
import Img from '@/components/Img'

export default function FavoritesPage() {
  const { customer, loading } = useAuth()
  const { items, remove } = useWishlist()

  return (
    <Shell wide>
      <h1 className="text-3xl mb-8" style={{ fontFamily: "'Henry Trial', serif" }}>Favorites</h1>
      {loading ? <p className="text-sm">Loading…</p> : !customer ? (
        <p className="text-sm text-[#4B4B4B]"><Link href="/login?next=/favorites" className="underline">Sign in</Link> to see the favorites you saved in the app.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[#4B4B4B]">No favorites yet. Tap the heart on any product.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((i) => (
            <div key={i.id}>
              <div className="aspect-square bg-[#F5F4F0] relative overflow-hidden">
                {i.image && <Img src={i.image} alt={i.name} />}
              </div>
              <p className="text-sm mt-2">{i.name}</p>
              <p className="text-sm text-[#4B4B4B]">{formatPrice(i.price)}</p>
              <button onClick={() => remove(i.id)} className="text-xs text-[#8E8E8E] hover:text-red-600 mt-1">Remove</button>
            </div>
          ))}
        </div>
      )}
    </Shell>
  )
}
