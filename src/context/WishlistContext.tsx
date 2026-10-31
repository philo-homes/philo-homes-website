'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Product, productImage, productPrice, readWishlist, WishlistItem, writeWishlist } from '@/lib/medusa'
import { useAuth } from './AuthContext'
import { toast } from '@/components/Toast'

type WishlistState = {
  items: WishlistItem[]
  has: (productId: string) => boolean
  toggle: (product: Product) => Promise<'added' | 'removed' | 'sign-in'>
  remove: (productId: string) => Promise<void>
}

const WishlistContext = createContext<WishlistState | null>(null)

// Shared with the app through customer metadata (wishlist / wishlist_updated_at).
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { customer, refresh } = useAuth()
  const [items, setItems] = useState<WishlistItem[]>([])

  useEffect(() => {
    setItems(readWishlist(customer))
  }, [customer])

  const persist = useCallback(async (next: WishlistItem[]) => {
    const previous = items
    setItems(next)
    try {
      await writeWishlist(next)
      await refresh()
    } catch {
      setItems(previous)
      toast.error('Could not save your favorites. Please try again.')
    }
  }, [items, refresh])

  const has = useCallback((id: string) => items.some((i) => i.id === id), [items])

  const toggle = useCallback(async (product: Product) => {
    if (!customer) return 'sign-in' as const
    if (items.some((i) => i.id === product.id)) {
      await persist(items.filter((i) => i.id !== product.id))
      return 'removed' as const
    }
    await persist([
      ...items,
      { id: product.id, name: product.title, price: productPrice(product) ?? 0, image: productImage(product), addedDate: new Date().toISOString() },
    ])
    return 'added' as const
  }, [customer, items, persist])

  const remove = useCallback(async (id: string) => {
    await persist(items.filter((i) => i.id !== id))
  }, [items, persist])

  const value = useMemo(() => ({ items, has, toggle, remove }), [items, has, toggle, remove])
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
