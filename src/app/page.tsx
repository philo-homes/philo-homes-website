'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Shell from '@/components/Shell'
import ProductCard from '@/components/ProductCard'
import { SectionTitle } from '@/components/Section'
import { listProducts, Product } from '@/lib/medusa'
import { useAuth } from '@/context/AuthContext'

// Style tiles ("Featured Collections" in the Figma) — searches the catalog.
const STYLES = [
  { name: 'Scandinavian', q: 'scandinavian', image: '/images/templates/living-room-1-template.png' },
  { name: 'Minimalist', q: 'minimalist', image: '/images/templates/bedroom-1-template.jpg' },
  { name: 'Modern', q: 'modern', image: '/images/templates/livingroom-2-template.jpg' },
  { name: 'Classic', q: 'classic', image: '/images/templates/bedroom-2-template.png' },
]

const OFFERS = [
  { title: 'Scan it in the app', body: 'Walk through your room with your phone. The Philo Homes app turns the scan into a true-to-size 3D model — the only step that needs the phone.', image: '/images/mathilde-langevin-LdPzzJcrPLM-unsplash.jpg' },
  { title: 'AI designs it', body: 'Pick a style and our AI furnishes the room with real, in-stock pieces — placed to scale, not just pasted on a photo.', image: '/images/templates/livingroom-2-template.jpg' },
  { title: 'Refine it here', body: 'Open the same design on the web: walk the 3D room, swap or add furniture, and keep every change in sync with your phone.', image: '/images/about-image-2.jpg' },
  { title: 'Shop the look', body: 'Everything in the design is purchasable. Add the whole room to your cart, or just the pieces you love.', image: '/images/templates/bedroom-1-template.jpg' },
]

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const { customer } = useAuth()

  useEffect(() => {
    listProducts({ limit: 24 }).then(setProducts).catch(() => setProducts([]))
  }, [])

  const trending = products.slice(0, 3)
  const recommended = products.slice(3, 6)

  return (
    <Shell wide>
      {/* Hero */}
      <section className="relative h-[520px] -mx-5 md:-mx-10 -mt-10 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/mathilde-langevin-LdPzzJcrPLM-unsplash.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative h-full flex flex-col items-center justify-center text-center text-white px-6">
          <h1 className="text-4xl md:text-5xl" style={{ fontFamily: "'Henry Trial', serif" }}>Your room, designed by AI. Shoppable today.</h1>
          <p className="mt-4 max-w-xl text-sm md:text-base text-white/85">Scan your room with the app, let the AI furnish it with real pieces, then refine and buy everything right here.</p>
          <Link href={customer ? '/designs' : '/shop'} className="mt-6 bg-[#D1903E] hover:bg-[#C37933] px-6 py-3 text-sm tracking-wide">
            {customer ? 'Open my designs' : 'Start shopping'}
          </Link>
        </div>
      </section>

      {/* What we offer */}
      <section className="py-16">
        <h2 className="text-center text-2xl md:text-3xl mb-10" style={{ fontFamily: "'Henry Trial', serif" }}>What we offer</h2>
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-12">
          {OFFERS.map((o, i) => (
            <div key={o.title} className={`grid grid-cols-2 gap-6 items-center ${i % 2 ? 'md:[&>*:first-child]:order-2' : ''}`}>
              <div>
                <h3 className="text-xl mb-2" style={{ fontFamily: "'Henry Trial', serif" }}>{o.title}</h3>
                <p className="text-sm text-[#4B4B4B] leading-relaxed">{o.body}</p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={o.image} alt="" className="aspect-[4/3] w-full object-cover shadow-sm" />
            </div>
          ))}
        </div>
      </section>

      {/* Curated recommendations */}
      <section className="-mx-5 md:-mx-10">
        <div className="relative h-40 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/community-hero.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative h-full flex flex-col items-center justify-center text-white text-center">
            <h2 className="text-2xl" style={{ fontFamily: "'Henry Trial', serif" }}>Your Curated Recommendations</h2>
            <p className="text-xs text-white/80 mt-1">Pieces that fit the rooms you&apos;ve scanned.</p>
          </div>
        </div>
        <div className="px-5 md:px-10 py-10">
          <SectionTitle title="" href="/shop" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {recommended.map((p) => <ProductCard key={p.id} product={p} badge="Trending" />)}
          </div>
        </div>
      </section>

      {/* Sale band */}
      <section className="-mx-5 md:-mx-10 bg-[#E5C68C]/70">
        <div className="relative h-40 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/templates/living-room-1-template.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
          <div className="relative h-full flex flex-col items-center justify-center text-center">
            <h2 className="text-2xl" style={{ fontFamily: "'Henry Trial', serif" }}>Summer Sale</h2>
            <p className="text-xs text-[#4B4B4B] mt-1">Seasonal picks across the catalog.</p>
          </div>
        </div>
        <div className="px-5 md:px-10 py-10">
          <SectionTitle title="" href="/shop" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
            {products.slice(6, 11).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* Featured collections */}
      <section className="py-16">
        <SectionTitle title="Featured Collections" href="/shop" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {STYLES.map((s) => (
            <Link key={s.name} href={`/shop?q=${s.q}`} className="relative aspect-square overflow-hidden group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                <span className="text-white text-lg" style={{ fontFamily: "'Henry Trial', serif" }}>{s.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Top trending */}
      <section className="-mx-5 md:-mx-10 bg-[#EEF1F8] px-5 md:px-10 py-14">
        <SectionTitle title="Top Trending Products" href="/shop" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {trending.map((p) => <ProductCard key={p.id} product={p} badge="Trending" />)}
        </div>
      </section>
    </Shell>
  )
}
