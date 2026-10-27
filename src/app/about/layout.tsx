import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us',
  description:
    "Decades of design expertise, now powered by AI. Meet the team bringing professional interior design to every home.",
  alternates: { canonical: '/about' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
