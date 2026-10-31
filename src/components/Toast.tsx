'use client'

import { useEffect, useState } from 'react'

// Lightweight global toast: `toast.success('Added to cart')` from anywhere,
// one host mounted in Providers. Replaces alert() for non-destructive feedback.
type ToastItem = { id: number; kind: 'success' | 'error' | 'info'; text: string }
let listener: ((t: ToastItem) => void) | null = null
let seq = 0
const push = (kind: ToastItem['kind'], text: string) => listener?.({ id: ++seq, kind, text })
export const toast = {
  success: (text: string) => push('success', text),
  error: (text: string) => push('error', text),
  info: (text: string) => push('info', text),
}

export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([])
  useEffect(() => {
    listener = (t) => {
      setItems((list) => [...list.slice(-2), t])
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), 2600)
    }
    return () => { listener = null }
  }, [])
  if (items.length === 0) return null
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      {items.map((t) => (
        <div key={t.id} className={`px-4 py-2 text-sm text-white shadow-lg ${t.kind === 'error' ? 'bg-red-700' : t.kind === 'success' ? 'bg-[#10182B]' : 'bg-[#4B4B4B]'}`}>
          {t.text}
        </div>
      ))}
    </div>
  )
}
