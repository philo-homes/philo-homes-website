import type { Metadata } from 'next'
import Link from 'next/link'
import Shell from '@/components/Shell'
import { formatPostDate, getAllPosts } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Design ideas, style debates and practical advice from the Philo Homes team.',
  alternates: { canonical: '/blog' },
}

// Article index: every file in content/blog, newest first.
export default function BlogIndexPage() {
  const posts = getAllPosts()
  const [first, ...rest] = posts

  return (
    <Shell>
      <p className="text-xs text-[#8E8E8E] mb-4"><Link href="/">Home</Link> / Blog</p>
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl" style={{ fontFamily: "'Henry Trial', serif" }}>Blog</h1>
        <p className="text-sm text-[#4B4B4B] mt-2 max-w-xl">Design ideas, style debates and practical advice from the Philo Homes team.</p>
      </div>

      {posts.length === 0 && <p className="text-sm text-[#4B4B4B]">No articles yet. Check back soon.</p>}

      {first && (
        <Link href={`/blog/${first.slug}`} className="group grid md:grid-cols-12 gap-6 md:gap-10 mb-12">
          <div className="md:col-span-7 aspect-[16/9] overflow-hidden bg-[#F5F4F0]">
            {first.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={first.cover} alt={first.coverAlt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            )}
          </div>
          <div className="md:col-span-5 flex flex-col justify-center">
            <TagRow tags={first.tags} />
            <h2 className="text-2xl md:text-3xl mt-3 group-hover:text-[#A25F2C]" style={{ fontFamily: "'Henry Trial', serif" }}>{first.title}</h2>
            {first.excerpt && <p className="text-sm text-[#4B4B4B] mt-3 leading-relaxed">{first.excerpt}</p>}
            <p className="text-xs text-[#8E8E8E] mt-4">{first.author} · {formatPostDate(first.date)}</p>
          </div>
        </Link>
      )}

      {rest.length > 0 && (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {rest.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="group block">
                <div className="aspect-[4/3] overflow-hidden bg-[#F5F4F0]">
                  {post.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.cover} alt={post.coverAlt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  )}
                </div>
                <TagRow tags={post.tags} className="mt-3" />
                <h2 className="text-lg mt-2 group-hover:text-[#A25F2C]" style={{ fontFamily: "'Henry Trial', serif" }}>{post.title}</h2>
                {post.excerpt && <p className="text-sm text-[#4B4B4B] mt-2 line-clamp-3">{post.excerpt}</p>}
                <p className="text-xs text-[#8E8E8E] mt-3">{formatPostDate(post.date)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  )
}

function TagRow({ tags, className = '' }: { tags: string[]; className?: string }) {
  if (!tags.length) return null
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`}>
      {tags.map((t) => (
        <li key={t} className="text-[11px] px-1.5 py-0.5 bg-[#FCF9F2] text-[#A25F2C]">#{t.replace(/\s+/g, '')}</li>
      ))}
    </ul>
  )
}
