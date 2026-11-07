'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Product, productImage, productPrice, readWishlist, readWishlistFolders, WishlistFolder, WishlistItem, writeWishlist } from '@/lib/medusa'
import { useAuth } from './AuthContext'
import { toast } from '@/components/Toast'

type WishlistState = {
  items: WishlistItem[]
  folders: WishlistFolder[]
  has: (productId: string) => boolean
  toggle: (product: Product) => Promise<'added' | 'removed' | 'sign-in'>
  remove: (productId: string) => Promise<void>
  createFolder: (name: string) => Promise<WishlistFolder | null>
  renameFolder: (id: string, name: string) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  setItemFolder: (productId: string, folderId: string, inFolder: boolean) => Promise<void>
}

const WishlistContext = createContext<WishlistState | null>(null)

// Shared with the app through customer metadata (wishlist / wishlist_folders /
// wishlist_updated_at). Removing an item cascades it out of every album.
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { customer, refresh } = useAuth()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [folders, setFolders] = useState<WishlistFolder[]>([])

  useEffect(() => {
    setItems(readWishlist(customer))
    setFolders(readWishlistFolders(customer))
  }, [customer])

  const persist = useCallback(async (nextItems: WishlistItem[], nextFolders: WishlistFolder[]) => {
    const prevItems = items
    const prevFolders = folders
    setItems(nextItems)
    setFolders(nextFolders)
    try {
      await writeWishlist(nextItems, nextFolders)
      await refresh()
    } catch {
      setItems(prevItems)
      setFolders(prevFolders)
      toast.error('Could not save your favorites. Please try again.')
    }
  }, [items, folders, refresh])

  const has = useCallback((id: string) => items.some((i) => i.id === id), [items])

  const toggle = useCallback(async (product: Product) => {
    if (!customer) return 'sign-in' as const
    if (items.some((i) => i.id === product.id)) {
      await persist(items.filter((i) => i.id !== product.id), folders.map((f) => ({ ...f, itemIds: f.itemIds.filter((x) => x !== product.id) })))
      return 'removed' as const
    }
    await persist([...items, { id: product.id, name: product.title, price: productPrice(product) ?? 0, image: productImage(product), addedDate: new Date().toISOString() }], folders)
    return 'added' as const
  }, [customer, items, folders, persist])

  const remove = useCallback(async (id: string) => {
    await persist(items.filter((i) => i.id !== id), folders.map((f) => ({ ...f, itemIds: f.itemIds.filter((x) => x !== id) })))
  }, [items, folders, persist])

  const createFolder = useCallback(async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return null
    const folder: WishlistFolder = { id: `album-${Date.now()}`, name: trimmed, itemIds: [], createdAt: new Date().toISOString() }
    await persist(items, [...folders, folder])
    return folder
  }, [items, folders, persist])

  const renameFolder = useCallback(async (id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    await persist(items, folders.map((f) => (f.id === id ? { ...f, name: trimmed } : f)))
  }, [items, folders, persist])

  const deleteFolder = useCallback(async (id: string) => {
    await persist(items, folders.filter((f) => f.id !== id))
  }, [items, folders, persist])

  const setItemFolder = useCallback(async (productId: string, folderId: string, inFolder: boolean) => {
    await persist(items, folders.map((f) => {
      if (f.id !== folderId) return f
      const ids = f.itemIds.filter((x) => x !== productId)
      return { ...f, itemIds: inFolder ? [...ids, productId] : ids }
    }))
  }, [items, folders, persist])

  const value = useMemo(() => ({ items, folders, has, toggle, remove, createFolder, renameFolder, deleteFolder, setItemFolder }), [items, folders, has, toggle, remove, createFolder, renameFolder, deleteFolder, setItemFolder])
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
