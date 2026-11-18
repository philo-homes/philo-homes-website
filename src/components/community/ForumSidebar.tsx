'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Plus, Hash, Check } from 'lucide-react'
import { getStartedTasks, trendingTopics, relatedPosts } from '@/lib/forum-data'

export default function ForumSidebar() {
  const [completed, setCompleted] = useState<boolean[]>(() => getStartedTasks.map(() => false))

  const toggleTask = (index: number) =>
    setCompleted((prev) => prev.map((done, i) => (i === index ? !done : done)))

  return (
    <aside className="flex w-full flex-col gap-[41px] lg:w-[283px] lg:shrink-0">
      <div className="flex flex-col gap-8">
        <Link
          href="/community/forum"
          title="Coming soon"
          className="flex h-10 w-full items-center justify-center gap-1 rounded-[4px] bg-[var(--primary-400)] px-4 py-3 text-[14px] text-[#101a2e] transition-colors hover:bg-[var(--primary-500)]"
        >
          <Plus size={24} strokeWidth={1.5} />
          Create New Post
        </Link>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-[24px] leading-none text-black">Get Started</h2>
          <ul className="flex flex-col gap-[11px]">
            {getStartedTasks.map((task, index) => {
              const done = completed[index]
              return (
                <li key={task}>
                  <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--neutral-600)]">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={done}
                      onChange={() => toggleTask(index)}
                    />
                    <span
                      aria-hidden
                      className={`flex size-4 items-center justify-center rounded-[2px] border ${
                        done
                          ? 'border-[var(--primary-400)] bg-[var(--primary-400)] text-[#101a2e]'
                          : 'border-[var(--neutral-300)] bg-white'
                      }`}
                    >
                      {done && <Check size={12} strokeWidth={2.5} />}
                    </span>
                    <span className={done ? 'line-through opacity-60' : ''}>{task}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-[24px] leading-none text-black">Trends</h2>
          <ul className="flex flex-col gap-2">
            {trendingTopics.map((topic) => (
              <li key={topic.label}>
                <Link
                  href={topic.href}
                  className="flex items-start gap-[2px] text-[12px] leading-[16px] text-[var(--neutral-600)] transition-colors hover:text-[var(--primary-700)]"
                >
                  <Hash size={16} strokeWidth={1.5} className="shrink-0" />
                  <span>{topic.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex flex-col gap-[25px]">
        {relatedPosts.map((post, index) => (
          <Link
            key={`${post.slug}-${index}`}
            href={`/community/forum/${post.slug}`}
            className="group relative block h-[264px] w-full overflow-hidden rounded-[4px] bg-[#d9d9d9]"
          >
            <Image
              src={post.image}
              alt={post.title}
              fill
              sizes="283px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-b from-transparent to-black/70 px-2 py-4">
              <p className="text-[16px] text-white">{post.title}</p>
              <p className="text-[12px] text-[#eeeeee]">{post.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  )
}
