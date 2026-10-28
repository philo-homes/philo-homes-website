import Link from 'next/link'

export function SectionTitle({ title, href, hrefLabel = 'View more' }: { title: string; href?: string; hrefLabel?: string }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <h2 className="text-2xl md:text-3xl" style={{ fontFamily: "'Henry Trial', serif" }}>{title}</h2>
      {href && <Link href={href} className="text-sm text-[#4B4B4B] hover:text-[#D1903E]">{hrefLabel} ›</Link>}
    </div>
  )
}

export function Button({ children, variant = 'primary', className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' }) {
  const base = 'inline-flex items-center justify-center px-5 py-2.5 text-sm tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const styles =
    variant === 'primary'
      ? 'bg-[#D1903E] text-white hover:bg-[#C37933]'
      : variant === 'outline'
      ? 'border border-[#10182B] text-[#10182B] hover:bg-[#10182B] hover:text-white'
      : 'text-[#10182B] hover:text-[#D1903E]'
  return (
    <button className={`${base} ${styles} ${className}`} {...rest}>{children}</button>
  )
}

export function Field({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-sm">
      <span className="block text-xs text-[#4B4B4B] mb-1">{label}</span>
      <input className="w-full border border-[#e1e1e1] px-3 py-2 focus:outline-none focus:border-[#D1903E] bg-white" {...rest} />
    </label>
  )
}
