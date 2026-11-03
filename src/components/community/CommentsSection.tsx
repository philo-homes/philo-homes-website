'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MessageSquare, ThumbsUp, Bold, Italic, Link as LinkIcon } from 'lucide-react'
import type { ForumComment } from '@/lib/forum-data'

const currentUser = { name: 'You', avatar: '/images/forum/avatar.svg' }

function Avatar({ src, name }: { src: string; name: string }) {
  return <Image src={src} alt={name} width={24} height={24} className="size-6 shrink-0" />
}

interface CommentItemProps {
  comment: ForumComment
  onReply: (parentId: string, body: string) => void
  isReply?: boolean
}

function CommentItem({ comment, onReply, isReply = false }: CommentItemProps) {
  const [liked, setLiked] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const [replyText, setReplyText] = useState('')

  const likeCount = comment.likes + (liked ? 1 : 0)

  const submitReply = () => {
    const text = replyText.trim()
    if (!text) return
    onReply(comment.id, text)
    setReplyText('')
    setIsReplying(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1 text-[12px]">
          <Avatar src={comment.author.avatar} name={comment.author.name} />
          <span className="text-[#101a2e]">{comment.author.name}</span>
          <span className="text-[var(--neutral-500)]">{comment.postedAt}</span>
        </div>
        <p className="text-[12px] leading-normal text-[#101a2e]">{comment.body}</p>
      </div>

      <div className="flex items-center gap-[17px] text-[12px] text-[#101a2e]">
        {!isReply && (
          <button
            type="button"
            className="flex items-center gap-1 transition-colors hover:text-[var(--primary-700)]"
            onClick={() => setIsReplying((open) => !open)}
          >
            <MessageSquare size={16} strokeWidth={1.5} />
            Reply
          </button>
        )}
        {isReply && (
          <span className="flex items-center gap-1 opacity-60">
            <MessageSquare size={16} strokeWidth={1.5} />
            Reply
          </span>
        )}
        <button
          type="button"
          aria-pressed={liked}
          className={`flex items-center gap-1 transition-colors hover:text-[var(--primary-700)] ${
            liked ? 'text-[var(--primary-700)]' : ''
          }`}
          onClick={() => setLiked((v) => !v)}
        >
          <ThumbsUp size={16} strokeWidth={1.5} fill={liked ? 'currentColor' : 'none'} />
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>
      </div>

      {isReplying && (
        <div className="mt-1 flex flex-col gap-2 rounded-[4px] border border-[var(--neutral-400)] bg-white px-4 py-3">
          <textarea
            autoFocus
            rows={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Reply to ${comment.author.name}...`}
            className="w-full resize-none text-[12px] text-[#101a2e] outline-none placeholder:text-[var(--neutral-500)]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-[4px] px-3 py-1 text-[12px] text-[var(--neutral-600)] hover:bg-[var(--neutral-100)]"
              onClick={() => setIsReplying(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-[4px] bg-[var(--primary-400)] px-3 py-1 text-[12px] text-[#101a2e] hover:bg-[var(--primary-500)] disabled:opacity-50"
              disabled={!replyText.trim()}
              onClick={submitReply}
            >
              Reply
            </button>
          </div>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 flex flex-col gap-4 border-l border-[var(--neutral-300)] pl-8">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} onReply={onReply} isReply />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommentsSection({ initialComments }: { initialComments: ForumComment[] }) {
  const [comments, setComments] = useState<ForumComment[]>(initialComments)
  const [draft, setDraft] = useState('')

  const addReply = (parentId: string, body: string) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === parentId
          ? {
              ...comment,
              replies: [
                ...(comment.replies ?? []),
                {
                  id: `${parentId}-r${Date.now()}`,
                  author: currentUser,
                  postedAt: 'Posted just now',
                  body,
                  likes: 0,
                },
              ],
            }
          : comment,
      ),
    )
  }

  const postComment = () => {
    const body = draft.trim()
    if (!body) return
    setComments((prev) => [
      ...prev,
      { id: `c${Date.now()}`, author: currentUser, postedAt: 'Posted just now', body, likes: 0 },
    ])
    setDraft('')
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-[11px]">
        <h2 className="font-serif text-[32px] leading-none text-black">Comments</h2>
        <div className="flex w-full flex-col gap-4 lg:w-[580px]">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} onReply={addReply} />
          ))}
        </div>
      </div>

      {/* Comment composer */}
      <form
        className="flex w-full flex-col gap-6 rounded-[4px] border border-[var(--neutral-400)] bg-white px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault()
          postComment()
        }}
      >
        <div className="flex items-start gap-2">
          <Avatar src={currentUser.avatar} name={currentUser.name} />
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write your comment..."
            className="min-h-[22px] w-full resize-none text-[14px] leading-[22px] text-[#101a2e] outline-none placeholder:text-[var(--neutral-500)]"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[10px] text-[#101a2e]">
            <button type="button" aria-label="Bold" className="hover:text-[var(--primary-700)]">
              <Bold size={16} strokeWidth={1.5} />
            </button>
            <button type="button" aria-label="Italic" className="hover:text-[var(--primary-700)]">
              <Italic size={16} strokeWidth={1.5} />
            </button>
            <button type="button" aria-label="Insert link" className="hover:text-[var(--primary-700)]">
              <LinkIcon size={16} strokeWidth={1.5} />
            </button>
          </div>
          <button
            type="submit"
            disabled={!draft.trim()}
            className="min-w-[98px] rounded-[4px] bg-[var(--primary-400)] px-2 py-[7px] text-center text-[14px] font-medium leading-[22px] text-[#101a2e] transition-colors hover:bg-[var(--primary-500)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Post Comment
          </button>
        </div>
      </form>
    </section>
  )
}
