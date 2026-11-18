import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Shell from '@/components/Shell'
import CommentsSection from '@/components/blog/CommentsSection'
import { formatPostDate, getAllPosts, getPost } from '@/lib/blog'

type Params = Promise<{ slug: string }>

// Every article is rendered at build time; an unknown slug is a 404.
export const dynamicParams = false

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return { title: 'Blog' }
  return {
    title: post.title,
    description: post.excerpt || undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: post.cover ? { images: [post.cover] } : undefined,
  }
}

function truncate(text: string, max = 40) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const others = getAllPosts().filter((p) => p.slug !== post.slug).slice(0, 3)

  return (
    <Shell>
      <p className="text-xs text-[#8E8E8E] mb-4">
        <Link href="/">Home</Link> / <Link href="/blog">Blog</Link> / <span title={post.title}>{truncate(post.title)}</span>
      </p>

      <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
        <article className="lg:col-span-8 max-w-[760px]">
          <header className="mb-8">
            {post.tags.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 mb-3">
                {post.tags.map((t) => (
                  <li key={t} className="text-[11px] px-1.5 py-0.5 bg-[#FCF9F2] text-[#A25F2C]">#{t.replace(/\s+/g, '')}</li>
                ))}
              </ul>
            )}
            <h1 className="text-3xl md:text-4xl leading-tight" style={{ fontFamily: "'Henry Trial', serif" }}>{post.title}</h1>
            <p className="text-xs text-[#8E8E8E] mt-3">{post.author} · {formatPostDate(post.date)}</p>
          </header>

          <div className="blog-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
          </div>

          <div className="mt-14 pt-10 border-t border-[#e8e4dc]">
            <CommentsSection slug={post.slug} />
          </div>
        </article>

        <aside className="lg:col-span-4 space-y-10">
          {others.length > 0 && (
            <section>
              <h2 className="text-lg mb-4" style={{ fontFamily: "'Henry Trial', serif" }}>More from the blog</h2>
              <ul className="space-y-5">
                {others.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/blog/${p.slug}`} className="group relative block h-[200px] overflow-hidden bg-[#F5F4F0]">
                      {p.cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.cover} alt={p.coverAlt} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                        <p className="text-base leading-snug">{p.title}</p>
                        {p.excerpt && <p className="text-xs text-white/80 mt-1 line-clamp-2">{p.excerpt}</p>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="bg-[#FCF9F2] p-5">
            <h2 className="text-lg mb-2" style={{ fontFamily: "'Henry Trial', serif" }}>Design your own room</h2>
            <p className="text-sm text-[#4B4B4B]">Browse furniture that fits these looks, or start from one of our room templates.</p>
            <div className="flex gap-4 mt-4 text-sm">
              <Link href="/shop" className="underline">Shop</Link>
              <Link href="/templates" className="underline">Inspiration</Link>
            </div>
          </section>
        </aside>
      </div>
    </Shell>
  )
}
