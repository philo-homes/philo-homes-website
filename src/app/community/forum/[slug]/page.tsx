import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import CommunityHeader from '@/components/community/CommunityHeader'
import ForumSidebar from '@/components/community/ForumSidebar'
import CommentsSection from '@/components/community/CommentsSection'
import { forumPosts, getForumPost } from '@/lib/forum-data'

type Params = Promise<{ slug: string }>

export function generateStaticParams() {
  return forumPosts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const post = getForumPost(slug)
  if (!post) return { title: 'Forum' }
  return {
    title: post.title,
    description: post.intro[0],
    alternates: { canonical: `/community/forum/${post.slug}` },
  }
}

function truncate(text: string, max = 16) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}....` : text
}

export default async function ForumDetailPage({ params }: { params: Params }) {
  const { slug } = await params
  const post = getForumPost(slug)
  if (!post) notFound()

  return (
    <div className="min-h-screen bg-white text-[#101a2e]">
      <CommunityHeader />

      <main className="mx-auto flex max-w-[1280px] flex-col gap-[22px] px-5 pt-9 pb-20 sm:px-10 lg:px-[80px]">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[16px] text-[var(--neutral-500)]">
          <Link href="/" className="hover:text-[#101a2e]">Home</Link>
          <span>/</span>
          <Link href="/community" className="hover:text-[#101a2e]">Community</Link>
          <span>/</span>
          <Link href="/community/forum" className="hover:text-[#101a2e]">Forum</Link>
          <span>/</span>
          <span className="text-[#101a2e]" title={post.title}>{truncate(post.title)}</span>
        </nav>

        <div className="flex flex-col gap-12 lg:flex-row lg:gap-[98px]">
          <article className="flex w-full flex-col gap-8 lg:w-[706px]">
            <header className="flex flex-col gap-3">
              <h1 className="font-serif text-[32px] leading-none text-black">{post.title}</h1>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <ul className="flex items-center gap-[7px]">
                  {post.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-[2px] bg-[var(--primary-50)] p-1 text-[12px] leading-none text-[var(--primary-700)]"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-1 text-[12px]">
                  <Image src={post.author.avatar} alt={post.author.name} width={24} height={24} className="size-6" />
                  <span className="text-[#101a2e]">{post.author.name}</span>
                  <span className="text-[var(--neutral-500)]">{post.postedAt}</span>
                </div>
              </div>
            </header>

            <div className="flex flex-col gap-5 text-[12px] leading-normal text-[#101a2e]">
              <div className="flex flex-col gap-[14px]">
                {post.intro.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </div>

              <figure className="relative aspect-[685/289] w-full overflow-hidden rounded-[4px]">
                <Image
                  src={post.image.src}
                  alt={post.image.alt}
                  fill
                  priority
                  sizes="(min-width: 1024px) 706px, 100vw"
                  className="object-cover"
                />
              </figure>

              <div className="flex flex-col gap-[14px]">
                {post.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </div>
            </div>

            <CommentsSection initialComments={post.comments} />
          </article>

          <ForumSidebar />
        </div>
      </main>
    </div>
  )
}
