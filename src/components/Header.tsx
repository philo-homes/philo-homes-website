'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Heart, Menu, Search, ShoppingCart, User, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'

const NAV = [
  { name: 'Shop', href: '/shop' },
  { name: 'My Designs', href: '/designs' },
  { name: 'Inspiration', href: '/case-study' },
  { name: 'Community', href: '/community' },
  { name: 'About Us', href: '/about' },
]

// Figma "Website Refinement" header: brand row with utilities, then a nav row.
export default function Header() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { customer } = useAuth()
  const { count } = useCart()

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const term = q.trim()
    setShowSearch(false)
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : '/shop')
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#e8e4dc]">
      <div className="max-w-[1400px] mx-auto px-5 md:px-10">
        <div className="h-16 flex items-center justify-between">
          <Link href="/" className="text-xl tracking-wide" style={{ fontFamily: "'Henry Trial', serif" }}>
            Philo Homes
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <button onClick={() => setShowSearch((s) => !s)} className="hidden md:flex items-center gap-1.5 hover:text-[#D1903E]" aria-label="Search">
              <Search size={18} /> <span>Search</span>
            </button>
            <Link href="/favorites" className="hidden md:flex items-center gap-1.5 hover:text-[#D1903E]">
              <Heart size={18} /> <span>Favorites</span>
            </Link>
            <Link href="/cart" className="flex items-center gap-1.5 hover:text-[#D1903E]">
              <span className="relative">
                <ShoppingCart size={18} />
                {count > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#D1903E] text-white text-[10px] flex items-center justify-center">
                    {count}
                  </span>
                )}
              </span>
              <span className="hidden md:inline">Cart{count > 0 ? ` (${count})` : ''}</span>
            </Link>
            <Link href={customer ? '/account' : '/login'} className="hidden md:flex items-center gap-1.5 hover:text-[#D1903E]">
              <User size={18} /> <span>{customer ? customer.first_name || 'Account' : 'Sign Up/Log In'}</span>
            </Link>
            <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {showSearch && (
          <form onSubmit={submitSearch} className="pb-3">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search furniture…"
              className="w-full border border-[#e8e4dc] px-4 py-2 text-sm focus:outline-none focus:border-[#D1903E]"
            />
          </form>
        )}

        <nav className="hidden md:flex items-center justify-between h-10 text-[13px] tracking-wide">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href} className={`py-2 border-b-2 ${active ? 'border-[#D1903E] text-[#10182B]' : 'border-transparent text-[#4B4B4B] hover:text-[#10182B]'}`}>
                {item.name}
              </Link>
            )
          })}
        </nav>

        {open && (
          <nav className="md:hidden pb-4 flex flex-col gap-3 text-sm">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.name}</Link>
            ))}
            <Link href="/favorites" onClick={() => setOpen(false)}>Favorites</Link>
            <Link href={customer ? '/account' : '/login'} onClick={() => setOpen(false)}>{customer ? 'Account' : 'Sign Up/Log In'}</Link>
            <form onSubmit={submitSearch}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search furniture…" className="w-full border border-[#e8e4dc] px-3 py-2" />
            </form>
          </nav>
        )}
      </div>
    </header>
  )
}
