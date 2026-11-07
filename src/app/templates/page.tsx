'use client'

import Link from 'next/link'
import Shell from '@/components/Shell'
import { ROOM_TEMPLATES } from '@/lib/templates'
import DesignTabs from '@/components/DesignTabs'

// Same four room templates as the app's Design → Templates tab.
export default function TemplatesPage() {
  return (
    <Shell wide>
      <DesignTabs active="templates" />
      <p className="text-sm text-[#4B4B4B] mb-8">Designer-curated rooms. Open one to see every piece, then shop the whole look or just the parts you like.</p>
      <div className="grid md:grid-cols-2 gap-8">
        {ROOM_TEMPLATES.map((t) => (
          <Link key={t.id} href={`/templates/${t.id}`} className="group block">
            <div className="aspect-[4/3] overflow-hidden bg-[#F5F4F0]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.image} alt={t.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <p className="text-lg" style={{ fontFamily: "'Henry Trial', serif" }}>{t.name}</p>
              <p className="text-xs uppercase tracking-wider text-[#8E8E8E]">{t.style} · {t.room}</p>
            </div>
            <p className="text-sm text-[#4B4B4B]">{t.furniture.length} pieces</p>
          </Link>
        ))}
      </div>
    </Shell>
  )
}
