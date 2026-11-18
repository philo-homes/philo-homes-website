import type { Metadata } from 'next'
import Link from 'next/link'
import CommunityHeader from '@/components/community/CommunityHeader'
import ForumSidebar from '@/components/community/ForumSidebar'
import { forumPosts } from '@/lib/forum-data'

export const metadata: Metadata = {
  title: 'Forum',
  description: 'Threads and discussions from the Philo Homes design community.',
  alternates: { canonical: '/community/forum' },
}

/**
 * Placeholder index so breadcrumbs and "Forum" links resolve.
 * The full Forum Feed design (Figma node 388:1630) is not implemented yet.
 */
export default function ForumIndexPage() {
  return (
    <div className="min-h-screen bg-white text-[#101a2e]">
      <CommunityHeader />
      <main className="mx-auto flex max-w-[1280px] flex-col gap-[22px] px-5 pt-9 pb-20 sm:px-10 lg:px-[80px]">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[16px] text-[var(--neutral-500)]">
          <Link href="/" className="hover:text-[#101a2e]">Home</Link>
          <span>/</span>
          <Link href="/community" className="hover:text-[#101a2e]">Community</Link>
          <span>/</span>
          <span className="text-[#101a2e]">Forum</span>
        </nav>

        <div className="flex flex-col gap-12 lg:flex-row lg:gap-[98px]">
          <section className="flex w-full flex-col gap-4 lg:w-[706px]">
            <h1 className="font-serif text-[32px] leading-none text-black">Threads &amp; Discussions</h1>
            <ul className="flex flex-col divide-y divide-[var(--neutral-300)]">
              {forumPosts.map((post) => (
                <li key={post.slug} className="py-4">
                  <Link href={`/community/forum/${post.slug}`} className="flex flex-col gap-1 hover:text-[var(--primary-700)]">
                    <span className="text-[16px]">{post.title}</span>
                    <span className="text-[12px] text-[var(--neutral-500)]">
                      {post.author.name} · {post.postedAt} · {post.comments.length} comments
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <ForumSidebar />
        </div>
      </main>
    </div>
  )
}
