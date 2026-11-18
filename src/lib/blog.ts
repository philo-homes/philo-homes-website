import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

// Blog articles live as Markdown files in content/blog/<slug>.md with a small
// front-matter block (see the existing file for the fields). To publish a new
// article: add a file, commit, deploy. Pages are generated at build time, so
// nothing here runs on a request (and Vercel needs no runtime fs access).
//
// Comments are NOT here — they're in the Medusa backend, keyed by slug
// (/store/blog/<slug>/comments), moderated in Medusa Admin.

export type BlogPost = {
  slug: string
  title: string
  date: string // ISO yyyy-mm-dd
  author: string
  tags: string[]
  cover: string | null
  coverAlt: string
  excerpt: string
  content: string // markdown
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function toISODate(v: unknown): string {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10)
  if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 10)
  return ''
}

function readPost(file: string): BlogPost | null {
  const slug = file.replace(/\.md$/, '')
  if (!SLUG_RE.test(slug)) return null
  const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8')
  const { data, content } = matter(raw)
  const title = typeof data.title === 'string' ? data.title.trim() : ''
  if (!title) return null
  const tags = Array.isArray(data.tags) ? data.tags.map(String).map((t) => t.trim()).filter(Boolean) : []
  return {
    slug,
    title,
    date: toISODate(data.date),
    author: typeof data.author === 'string' && data.author.trim() ? data.author.trim() : 'Philo Homes Team',
    tags,
    cover: typeof data.cover === 'string' && data.cover.trim() ? data.cover.trim() : null,
    coverAlt: typeof data.coverAlt === 'string' ? data.coverAlt : title,
    excerpt: typeof data.excerpt === 'string' ? data.excerpt.trim() : '',
    content: content.trim(),
  }
}

/** Every article, newest first. Drafts can be kept out by prefixing the file name with `_`. */
export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map(readPost)
    .filter((p): p is BlogPost => !!p)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)))
}

export function getPost(slug: string): BlogPost | null {
  if (!SLUG_RE.test(slug)) return null
  const file = path.join(BLOG_DIR, `${slug}.md`)
  if (!fs.existsSync(file)) return null
  return readPost(`${slug}.md`)
}

export function getAllTags(posts: BlogPost[]): string[] {
  const seen = new Set<string>()
  for (const p of posts) for (const t of p.tags) seen.add(t)
  return [...seen].sort((a, b) => a.localeCompare(b))
}

export function formatPostDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}
