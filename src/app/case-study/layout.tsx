import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Case Studies',
  description:
    "See real rooms redesigned by Philo Homes' AI designer, with every piece of furniture purchasable in one click.",
  alternates: { canonical: '/case-study' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
