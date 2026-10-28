'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { addLineItem, Cart, ensureCart, removeLineItem, updateLineItem } from '@/lib/medusa'
import { useAuth } from './AuthContext'

type CartState = {
  cart: Cart | null
  count: number
  busy: boolean
  add: (variantId: string, quantity?: number) => Promise<void>
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
    try {
      setCart(await ensureCart(customer))
    } catch {
      setCart(null)
    }
  }, [customer])

  useEffect(() => {
    if (!authLoading) refresh()
  }, [authLoading, refresh])

  const add = useCallback(async (variantId: string, quantity = 1) => {
    setBusy(true)
    try {
      const c = cart ?? (await ensureCart(customer))
      setCart(await addLineItem(c.id, variantId, quantity))
    } finally {
      setBusy(false)
    }
  }, [cart, customer])

  const update = useCallback(async (lineId: string, quantity: number) => {
    if (!cart) return
    setBusy(true)
    try {
      setCart(quantity <= 0 ? await removeLineItem(cart.id, lineId) : await updateLineItem(cart.id, lineId, quantity))
    } finally {
      setBusy(false)
    }
  }, [cart])

  const remove = useCallback(async (lineId: string) => {
    if (!cart) return
    setBusy(true)
    try {
      setCart(await removeLineItem(cart.id, lineId))
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
