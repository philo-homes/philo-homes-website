'use client'

import { useState } from 'react'
import Link from 'next/link'

const COLUMNS = [
  { title: 'Company', links: [{ name: 'About Us', href: '/about' }, { name: 'Contact Us', href: '/book-demo' }, { name: 'Templates', href: '/templates' }, { name: 'Case Study', href: '/case-study' }, { name: 'Blog', href: '/blog' }] },
  { title: 'Shop', links: [{ name: 'Shop', href: '/shop' }, { name: 'My Designs', href: '/designs' }, { name: 'Favorites', href: '/favorites' }, { name: 'Privacy Policy', href: '/privacy' }] },
]

// Figma footer: navy band, brand + quote, link columns, newsletter.
export default function Footer() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      setStatus(res.ok ? 'success' : 'error')
      if (res.ok) setEmail('')
    } catch {
      setStatus('error')
    }
  }

  return (
    <footer className="bg-[#3C4A6B] text-white mt-20">
      <div className="max-w-[1400px] mx-auto px-5 md:px-10 py-14 grid gap-10 md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="text-[#E5C68C] tracking-[0.25em] text-sm" style={{ fontFamily: "'Henry Trial', serif" }}>PHILO<br />HOMES</div>
          <p className="mt-4 text-sm text-white/80 max-w-xs">&ldquo;Curating a world of inspiration, we&apos;ll help you design a home where you feel at your best and thrive.&rdquo;</p>
        </div>
        <div className="md:col-span-4 grid grid-cols-2 gap-6 text-sm">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <ul className="space-y-2">
                {c.links.map((l) => (
                  <li key={l.name}><Link href={l.href} className="text-white/80 hover:text-white">{l.name}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="md:col-span-4">
          <p className="text-sm">Sign up to hear about our exclusive offers, product launches and updates.</p>
          <form onSubmit={submit} className="mt-4">
            <label className="block text-xs text-white/70 mb-1">Email</label>
            <div className="flex">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@email.com" className="flex-1 bg-white text-[#10182B] px-3 py-2 text-sm focus:outline-none" />
              <button type="submit" disabled={status === 'loading'} className="bg-[#D1903E] hover:bg-[#C37933] px-4 py-2 text-sm">Subscribe</button>
            </div>
            {status === 'success' && <p className="text-xs mt-2 text-green-300">Thank you for subscribing!</p>}
            {status === 'error' && <p className="text-xs mt-2 text-red-300">Something went wrong. Please try again.</p>}
          </form>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/60">© {new Date().getFullYear()} Philo Homes, Maven Design LLC. All rights reserved.</div>
    </footer>
  )
}
