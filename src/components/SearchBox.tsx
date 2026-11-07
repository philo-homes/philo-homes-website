'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { listProducts, Product, productImage, productPrice } from '@/lib/medusa'
import { formatPrice } from '@/lib/format'
import { POPULAR_SEARCHES } from '@/lib/templates'

// Header search with the app's two helpers: popular searches when empty, and
// live product suggestions (top 6) while typing. Enter runs a full search.
export default function SearchBox({ onDone }: { onDone?: () => void }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    const term = q.trim()
    if (term.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    timer.current = setTimeout(() => {
      listProducts({ q: term, limit: 6 }).then(setResults).catch(() => setResults([])).finally(() => setLoading(false))
    }, 250)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [q])

  const go = (term: string) => {
    onDone?.()
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : '/shop')
  }

  return (
    <div className="relative pb-3">
      <form onSubmit={(e) => { e.preventDefault(); go(q.trim()) }}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search furniture…" className="w-full border border-[#e8e4dc] px-4 py-2 text-sm focus:outline-none focus:border-[#D1903E]" />
      </form>
      <div className="absolute left-0 right-0 top-full bg-white border border-[#e8e4dc] shadow-lg z-50 text-sm">
        {q.trim().length < 2 ? (
          <div className="p-3">
            <p className="text-[11px] uppercase tracking-wider text-[#8E8E8E] mb-2">Popular searches</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((s) => <button key={s} onClick={() => go(s)} className="px-3 py-1 bg-[#F5F4F0] hover:bg-[#EEEEEE] text-xs">{s}</button>)}
            </div>
          </div>
        ) : loading && results.length === 0 ? (
          <p className="p-3 text-[#8E8E8E]">Searching…</p>
        ) : results.length === 0 ? (
          <p className="p-3 text-[#8E8E8E]">No matches — press Enter to search anyway.</p>
        ) : (
          <ul>
            {results.map((p) => (
              <li key={p.id}>
                <Link href={`/shop/${p.handle}`} onClick={onDone} className="flex items-center gap-3 px-3 py-2 hover:bg-[#F5F4F0]">
                  <div className="w-10 h-10 bg-[#F5F4F0] shrink-0">
                    {productImage(p) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={productImage(p)} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <span className="flex-1 truncate">{p.title}</span>
                  <span className="text-[#4B4B4B]">{formatPrice(productPrice(p))}</span>
                </Link>
              </li>
            ))}
            <li><button onClick={() => go(q.trim())} className="w-full text-left px-3 py-2 text-xs text-[#4B4B4B] hover:bg-[#F5F4F0]">See all results for “{q.trim()}” →</button></li>
          </ul>
        )}
      </div>
    </div>
  )
}
