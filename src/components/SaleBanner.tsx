'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import ProductCard from './ProductCard'
import type { Deal } from '@/lib/catalog'
import { computeCountdown, getSaleEndsAt } from '@/lib/sale'

const pad = (n: number) => String(n).padStart(2, '0')

// Ticks once a second; re-asks for the end time so the weekly sale rolls over.
function useCountdown() {
  const [c, setC] = useState(() => computeCountdown(getSaleEndsAt()))
  useEffect(() => {
    const id = setInterval(() => setC(computeCountdown(getSaleEndsAt())), 1000)
    return () => clearInterval(id)
  }, [])
  return c
}

function Digits({ value, unit }: { value: number; unit: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="min-w-[3.2rem] text-center text-2xl md:text-3xl tabular-nums bg-white/15 backdrop-blur px-2 py-1" style={{ fontFamily: "'Henry Trial', serif" }}>{pad(value)}</span>
      <span className="text-[10px] uppercase tracking-[0.2em] mt-1 text-white/80">{unit}</span>
    </div>
  )
}

// The Figma "Summer Sale" band + the app's deals shelf, merged into one
// section on the shop page: photo banner with a live countdown, then the
// discounted products in a horizontal rail. Deals are picked exactly like the
// app (real sale prices if any, otherwise the stable demo shelf).
export default function SaleBanner({ deals }: { deals: Deal[] }) {
  const c = useCountdown()
  const biggest = deals.reduce((m, d) => Math.max(m, d.percent), 0)
  if (deals.length === 0) return null
  return (
    <section id="deals" className="-mx-5 md:-mx-10 my-12 scroll-mt-28">
      <div className="relative h-64 md:h-72 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/templates/livingroom-2-template.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#10182B]/80 via-[#10182B]/55 to-[#10182B]/30" />
        <div className="relative h-full max-w-[1400px] mx-auto px-5 md:px-10 flex flex-col md:flex-row md:items-center justify-center md:justify-between gap-6 text-white">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-[#E5C68C]">Limited time</p>
            <h2 className="text-3xl md:text-4xl mt-1" style={{ fontFamily: "'Henry Trial', serif" }}>Summer Sale</h2>
            <p className="text-sm text-white/85 mt-2">Up to {Math.round(biggest * 100)}% off selected pieces. Prices shown are what you pay at checkout.</p>
            <a href="#deals-rail" className="inline-block mt-4 bg-[#D1903E] hover:bg-[#C37933] text-white text-sm px-5 py-2.5">Explore deals</a>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs text-white/80 mb-2"><Clock size={14} /> Sale ends in</p>
            <div className="flex items-start gap-2">
              {c.days > 0 && <Digits value={c.days} unit="days" />}
              <Digits value={c.hours} unit="hrs" />
              <span className="text-2xl md:text-3xl pt-1">:</span>
              <Digits value={c.minutes} unit="min" />
              <span className="text-2xl md:text-3xl pt-1">:</span>
              <Digits value={c.seconds} unit="sec" />
            </div>
          </div>
        </div>
      </div>
      <div id="deals-rail" className="max-w-[1400px] mx-auto px-5 md:px-10 pt-8 scroll-mt-28">
        <div className="flex items-end justify-between mb-4">
          <h3 className="text-2xl" style={{ fontFamily: "'Henry Trial', serif" }}>Special Deals</h3>
          <p className="text-xs text-[#4B4B4B] flex items-center gap-1"><Clock size={12} className="text-[#C0392B]" /> Ends in <span className="tabular-nums font-semibold text-[#C0392B]">{c.days > 0 ? `${c.days}d ` : ''}{pad(c.hours)}:{pad(c.minutes)}:{pad(c.seconds)}</span></p>
        </div>
        <div className="flex gap-5 overflow-x-auto pb-3 snap-x">
          {deals.map((d) => (
            <div key={d.product.id} className="w-56 md:w-64 shrink-0 snap-start">
              <ProductCard product={d.product} original={d.original} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
