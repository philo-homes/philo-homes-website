import Link from 'next/link'

// The app's Design screen has two tabs: your scanned rooms and the curated
// templates. Same split here, as two routes.
export default function DesignTabs({ active }: { active: 'recent' | 'templates' }) {
  const tab = (href: string, label: string, key: 'recent' | 'templates') => (
    <Link href={href} className={`pb-2 border-b-2 text-sm ${active === key ? 'border-[#D1903E] text-[#10182B]' : 'border-transparent text-[#4B4B4B] hover:text-[#10182B]'}`}>{label}</Link>
  )
  return (
    <div className="flex items-end justify-between mb-6">
      <h1 className="text-3xl" style={{ fontFamily: "'Henry Trial', serif" }}>{active === 'recent' ? 'My Designs' : 'Room Templates'}</h1>
      <div className="flex gap-6">{tab('/designs', 'My rooms', 'recent')}{tab('/templates', 'Templates', 'templates')}</div>
    </div>
  )
}
