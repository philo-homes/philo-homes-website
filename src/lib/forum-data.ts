export interface ForumAuthor {
  name: string
  avatar: string
}

export interface ForumComment {
  id: string
  author: ForumAuthor
  postedAt: string
  body: string
  likes: number
  replies?: ForumComment[]
}

export interface ForumPost {
  slug: string
  title: string
  tags: string[]
  author: ForumAuthor
  postedAt: string
  /** Paragraphs rendered before the hero image */
  intro: string[]
  image: { src: string; alt: string }
  /** Paragraphs rendered after the hero image */
  body: string[]
  comments: ForumComment[]
}

export interface RelatedPost {
  slug: string
  title: string
  excerpt: string
  image: string
}

export interface TrendingTopic {
  label: string
  href: string
}

const johnDoe: ForumAuthor = { name: 'John Doe', avatar: '/images/forum/avatar.svg' }

export const getStartedTasks = [
  'Complete your profile',
  'Explore Inspiration Feed',
  'Create your first post',
  'Follow 3 designers',
]

export const trendingTopics: TrendingTopic[] = [
  { label: 'Japandi is Everywhere, Is It Worth the Hype in 2025?', href: '/community/forum/japandi-worth-the-hype-2025' },
  { label: 'What Paint Color Makes a Room Feel Bigger?', href: '/community/forum' },
  { label: 'Mid-century Modern', href: '/community/forum' },
  { label: 'Best Budget Finds That Look Expensive!', href: '/community/forum' },
  { label: 'Retro-Futurism: How to Blend 70s Nostalgia?', href: '/community/forum' },
]

export const relatedPosts: RelatedPost[] = [
  {
    slug: 'japandi-worth-the-hype-2025',
    title: 'Lorem ipsum',
    excerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut',
    image: '/images/forum/dining-room.png',
  },
  {
    slug: 'japandi-worth-the-hype-2025',
    title: 'Lorem ipsum',
    excerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut',
    image: '/images/forum/japandi-living-room.png',
  },
]

export const forumPosts: ForumPost[] = [
  {
    slug: 'japandi-worth-the-hype-2025',
    title: 'Japandi is Everywhere — Is It Worth the Hype in 2025?',
    tags: ['#StyleDebate', '#Japandi', '#InteriorTrends'],
    author: johnDoe,
    postedAt: 'Posted 2 days ago',
    intro: [
      "Over the past year, I've noticed Japandi showing up literally everywhere — Instagram reels, Airbnb listings, showroom floors, even YouTube apartment tours. For those unfamiliar, it's a fusion of Scandinavian minimalism and Japanese Zen aesthetics: think low-profile furniture, light woods, muted colors, lots of negative space, and soft natural lighting.",
      "I'll admit I was immediately drawn to the aesthetic. It feels calming and balanced, especially in contrast to the maximalist trends we saw in previous years. I recently moved into a new condo and have been debating whether to commit fully to a Japandi-inspired living room. I'm talking linen curtains, oak coffee table, neutral modular sofa, textured walls, and floor seating.",
    ],
    image: {
      src: '/images/forum/japandi-living-room.png',
      alt: 'Japandi style living room with a grey modular sofa, oak coffee table and leather poufs',
    },
    body: [
      "BUT — I'm hesitating. Partly because I'm not sure if this trend has staying power. Will Japandi still feel relevant in 2–3 years, or will my place look like a 2024 Pinterest board? More importantly, how livable is this aesthetic long-term? Will I actually enjoy sitting on floor cushions? Do light fabrics + minimal surfaces = high maintenance?",
      "Also — are there any good ways to incorporate color or personality without breaking the Japandi vibe? I don't want it to feel sterile. I've been considering adding vintage ceramic pieces, a handwoven rug, or a dark walnut accent to ground the space.",
    ],
    comments: [
      {
        id: 'c1',
        author: johnDoe,
        postedAt: 'Posted 2 days ago',
        body: "I made the switch to Japandi two years ago and I love it. It's minimal but warm — definitely more livable than strict minimalism. Pro tip: go for washable white walls (e.g., satin finish paint) and modular furniture if you're worried about wear.",
        likes: 20,
        replies: [
          {
            id: 'c1-r1',
            author: johnDoe,
            postedAt: 'Posted 2 days ago',
            body: "Agree with the paint rec! Also, don't buy all beige everything — it starts to feel like a dentist's office 😂 Add a few plants or dark accents to keep it grounded.",
            likes: 4,
          },
        ],
      },
      {
        id: 'c2',
        author: johnDoe,
        postedAt: 'Posted 3 hours ago',
        body: "Personally I'm already over it. Japandi went from fresh to furniture showroom pretty quick. Try mixing in vintage or bold art to make it less cookie-cutter.",
        likes: 0,
      },
    ],
  },
]

export function getForumPost(slug: string): ForumPost | undefined {
  return forumPosts.find((post) => post.slug === slug)
}
