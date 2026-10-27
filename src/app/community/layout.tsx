import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Design Community',
  description:
    "Join the Philo Homes design community and be the first to know when we launch.",
  alternates: { canonical: '/community' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
