'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Heart, ShoppingCart, User, Menu, X, type LucideIcon } from 'lucide-react'

/**
 * Routes for Shop / Inspiration / Designers / Search / Favorites / Cart / Login
 * are placeholders from the Figma refinement; those pages are not built yet.
 */
interface NavItem {
  name: string
  href: string
  icon?: LucideIcon
}

const utilityLinks: NavItem[] = [
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Favorites', href: '/favorites', icon: Heart },
  { name: 'Cart (1)', href: '/cart', icon: ShoppingCart },
  { name: 'Sign Up/Log In', href: '/login', icon: User },
]

const navLinks: NavItem[] = [
  { name: 'Shop', href: '/shop' },
  { name: 'Inspiration', href: '/inspiration' },
  { name: 'Community', href: '/community' },
  { name: 'Designers', href: '/designers' },
  { name: 'About Us', href: '/about' },
]

function NavLink({
  item,
  active = false,
  className = '',
  iconSize = 24,
  onNavigate,
}: {
  item: NavItem
  active?: boolean
  className?: string
  iconSize?: number
  onNavigate?: () => void
}) {
  const Icon = item.icon
  const content = (
    <>
      {Icon && <Icon size={iconSize} strokeWidth={1.5} />}
      <span>{item.name}</span>
    </>
  )
  const base = `flex items-center gap-2 text-[14px] ${className}`

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`${base} transition-colors hover:text-[var(--primary-600)] ${active ? 'font-bold' : ''}`}
    >
      {content}
    </Link>
  )
}

/**
 * Header for the refreshed Community pages (Figma: "Philo Homes Website Refinement").
 * Scoped to /community so the rest of the site keeps the existing navy Header.
 */
export default function CommunityHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const closeMenu = () => setIsMenuOpen(false)

  return (
    <header className="bg-white text-[#101a2e]">
      {/* Top bar: logo + utility links */}
      <div className="border-b border-black/20">
        <div className="mx-auto flex h-[98px] max-w-[1280px] items-center justify-between px-5 sm:px-10 lg:px-[77px]">
          <Link href="/" className="font-serif text-[32px] leading-none">
            Philo Homes
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {utilityLinks.map((item) => (
              <NavLink key={item.name} item={item} />
            ))}
          </nav>

          <button
            type="button"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            className="p-2 lg:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Second row: primary navigation */}
      <nav className="hidden h-[50px] border-b border-black/20 lg:block">
        <ul className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-[80px]">
          {navLinks.map((item) => (
            <li key={item.name}>
              <NavLink item={item} active={isActive(item.href)} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="border-b border-black/20 px-5 py-6 lg:hidden">
          <ul className="flex flex-col gap-4">
            {navLinks.map((item) => (
              <li key={item.name}>
                <NavLink item={item} active={isActive(item.href)} onNavigate={closeMenu} />
              </li>
            ))}
          </ul>
          <ul className="mt-6 flex flex-col gap-4 border-t border-black/10 pt-6">
            {utilityLinks.map((item) => (
              <li key={item.name}>
                <NavLink item={item} iconSize={20} onNavigate={closeMenu} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  )
}
