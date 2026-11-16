import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Book a Demo',
  description:
    "See how Philo Homes' AI can transform your interior design workflow. Book a personalized demo.",
  alternates: { canonical: '/book-demo' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
