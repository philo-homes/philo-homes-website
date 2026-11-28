'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { addLineItem, Cart, ensureCart, getStoredCartId, removeLineItem, updateLineItem } from '@/lib/medusa'
import { useAuth } from './AuthContext'
import { toast } from '@/components/Toast'

type CartState = {
  cart: Cart | null
  count: number
  busy: boolean
  /** metadata: e.g. { source: 'design', room_id, design_id }, as the app sets from a design. */
  add: (variantId: string, quantity?: number, metadata?: Record<string, unknown>) => Promise<boolean>
  update: (lineId: string, quantity: number) => Promise<void>
  remove: (lineId: string) => Promise<void>
  refresh: () => Promise<void>
  setCart: (c: Cart | null) => void
}

const CartContext = createContext<CartState | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { customer, loading: authLoading } = useAuth()
  const [cart, setCart] = useState<Cart | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    // A signed-out visitor with no cart yet gets one lazily on first add,
    // not just for opening the site.
    if (!customer && !getStoredCartId()) {
      setCart(null)
      return
    }
    try {
      setCart(await ensureCart(customer))
    } catch {
      setCart(null)
    }
  }, [customer])

  useEffect(() => {
    if (!authLoading) refresh()
  }, [authLoading, refresh])

  const add = useCallback(async (variantId: string, quantity = 1, metadata?: Record<string, unknown>) => {
    setBusy(true)
    try {
      const c = cart ?? (await ensureCart(customer))
      setCart(await addLineItem(c.id, variantId, quantity, metadata))
      toast.success('Added to cart')
      return true
    } catch (e: any) {
      // e.g. out of stock, variant without a price, backend down
      toast.error(e?.message || 'Could not add to cart.')
      return false
    } finally {
      setBusy(false)
    }
  }, [cart, customer])

  const update = useCallback(async (lineId: string, quantity: number) => {
    if (!cart) return
    setBusy(true)
    try {
      setCart(quantity <= 0 ? await removeLineItem(cart.id, lineId) : await updateLineItem(cart.id, lineId, quantity))
    } catch (e: any) {
      toast.error(e?.message || 'Could not update the cart.')
    } finally {
      setBusy(false)
    }
  }, [cart])

  const remove = useCallback(async (lineId: string) => {
    if (!cart) return
    setBusy(true)
    try {
      setCart(await removeLineItem(cart.id, lineId))
    } catch (e: any) {
      toast.error(e?.message || 'Could not remove the item.')
    } finally {
      setBusy(false)
    }
  }, [cart])

  const count = useMemo(() => (cart?.items ?? []).reduce((n, i) => n + i.quantity, 0), [cart])
  const value = useMemo(() => ({ cart, count, busy, add, update, remove, refresh, setCart }), [cart, count, busy, add, update, remove, refresh])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
