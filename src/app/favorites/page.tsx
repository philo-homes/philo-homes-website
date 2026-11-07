'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FolderPlus, Trash2 } from 'lucide-react'
import Shell from '@/components/Shell'
import Img from '@/components/Img'
import { Button } from '@/components/Section'
import { useAuth } from '@/context/AuthContext'
import { useWishlist } from '@/context/WishlistContext'
import { formatPrice } from '@/lib/format'

// Favorites = the app's Saved Items: a flat list plus albums ("专辑") that
// group a subset of it. Both are read from / written to the same account data.
export default function FavoritesPage() {
  const { customer, loading } = useAuth()
  const { items, folders, remove, createFolder, renameFolder, deleteFolder, setItemFolder } = useWishlist()
  const [tab, setTab] = useState<'all' | 'albums'>('all')
  const [openFolder, setOpenFolder] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [assigning, setAssigning] = useState<string | null>(null)

  if (loading) return <Shell><p className="text-sm">Loading…</p></Shell>
  if (!customer) {
    return <Shell wide><h1 className="text-3xl mb-6" style={{ fontFamily: "'Henry Trial', serif" }}>Favorites</h1><p className="text-sm text-[#4B4B4B]"><Link href="/login?next=/favorites" className="underline">Sign in</Link> to see the favorites you saved in the app.</p></Shell>
  }

  const folder = folders.find((f) => f.id === openFolder) ?? null
  const shown = folder ? items.filter((i) => folder.itemIds.includes(i.id)) : items

  const card = (i: (typeof items)[number]) => (
    <div key={i.id}>
      <div className="aspect-square bg-[#F5F4F0] relative overflow-hidden">{i.image && <Img src={i.image} alt={i.name} />}</div>
      <p className="text-sm mt-2">{i.name}</p>
      <p className="text-sm text-[#4B4B4B]">{formatPrice(i.price)}</p>
      <div className="flex gap-3 mt-1 text-xs">
        {folders.length > 0 && (
          <button onClick={() => setAssigning(assigning === i.id ? null : i.id)} className="underline">Albums</button>
        )}
        {folder ? (
          <button onClick={() => setItemFolder(i.id, folder.id, false)} className="text-[#8E8E8E] hover:text-red-600">Remove from album</button>
        ) : (
          <button onClick={() => remove(i.id)} className="text-[#8E8E8E] hover:text-red-600">Remove</button>
        )}
      </div>
      {assigning === i.id && (
        <div className="mt-2 border border-[#e8e4dc] p-2 text-xs space-y-1 bg-white">
          {folders.map((f) => {
            const inF = f.itemIds.includes(i.id)
            return (
              <label key={f.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={inF} onChange={() => setItemFolder(i.id, f.id, !inF)} /> {f.name}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <Shell wide>
      <div className="flex items-end justify-between mb-6">
        <h1 className="text-3xl" style={{ fontFamily: "'Henry Trial', serif" }}>Favorites</h1>
        <div className="flex gap-6 text-sm">
          <button onClick={() => { setTab('all'); setOpenFolder(null) }} className={`pb-2 border-b-2 ${tab === 'all' ? 'border-[#D1903E]' : 'border-transparent text-[#4B4B4B]'}`}>All ({items.length})</button>
          <button onClick={() => setTab('albums')} className={`pb-2 border-b-2 ${tab === 'albums' ? 'border-[#D1903E]' : 'border-transparent text-[#4B4B4B]'}`}>Albums ({folders.length})</button>
        </div>
      </div>

      {tab === 'all' && (
        items.length === 0 ? <p className="text-sm text-[#4B4B4B]">No favorites yet. Tap the heart on any product.</p> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">{items.map(card)}</div>
        )
      )}

      {tab === 'albums' && !folder && (
        <div>
          <form onSubmit={async (e) => { e.preventDefault(); if (await createFolder(newName)) setNewName('') }} className="flex gap-2 mb-6 max-w-md">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New album name" className="flex-1 border border-[#e1e1e1] px-3 py-2 text-sm" />
            <Button type="submit" variant="outline"><FolderPlus size={16} className="mr-1" /> Create</Button>
          </form>
          {folders.length === 0 ? <p className="text-sm text-[#4B4B4B]">No albums yet. Create one to group your favorites by room or project.</p> : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {folders.map((f) => {
                const cover = items.find((i) => f.itemIds.includes(i.id))
                // Count only ids still in the wishlist (an album can hold stale ids).
                const count = f.itemIds.filter((id) => items.some((i) => i.id === id)).length
                return (
                  <div key={f.id}>
                    <button onClick={() => setOpenFolder(f.id)} className="block w-full text-left">
                      <div className="aspect-square bg-[#F5F4F0] relative overflow-hidden">{cover?.image && <Img src={cover.image} alt="" />}</div>
                      <p className="text-sm mt-2">{f.name}</p>
                      <p className="text-xs text-[#4B4B4B]">{count} item{count === 1 ? '' : 's'}</p>
                    </button>
                    <div className="flex gap-3 mt-1 text-xs">
                      <button onClick={() => { const n = window.prompt('Rename album', f.name); if (n) renameFolder(f.id, n) }} className="underline">Rename</button>
                      <button onClick={() => { if (window.confirm(`Delete album “${f.name}”? Your favorites stay saved.`)) deleteFolder(f.id) }} className="text-[#8E8E8E] hover:text-red-600 flex items-center gap-1"><Trash2 size={12} /> Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'albums' && folder && (
        <div>
          <button onClick={() => setOpenFolder(null)} className="text-xs underline text-[#4B4B4B] mb-4">← All albums</button>
          <h2 className="text-xl mb-4" style={{ fontFamily: "'Henry Trial', serif" }}>{folder.name}</h2>
          {shown.length === 0 ? <p className="text-sm text-[#4B4B4B]">This album is empty. Open a favorite and use “Albums” to add it here.</p> : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">{shown.map(card)}</div>
          )}
        </div>
      )}
    </Shell>
  )
}
