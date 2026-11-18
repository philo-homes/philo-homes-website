'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { listBlogComments, postBlogComment, type BlogComment } from '@/lib/medusa'
import { formatDate } from '@/lib/format'
import { toast } from '@/components/Toast'

// Comments under a blog article. Backed by /store/blog/<slug>/comments on the
// Medusa backend. Everything a reader posts is held for review: it shows to
// them right away with an "Awaiting review" badge, and to everyone else only
// after an admin approves it in Medusa Admin → Blog comments.

const MAX = 2000

function StatusNote({ c }: { c: BlogComment }) {
  if (!c.is_mine || c.status === 'approved') return null
  return c.status === 'pending' ? (
    <span className="text-[11px] px-1.5 py-0.5 bg-[#FCF9F2] text-[#A25F2C]">Awaiting review</span>
  ) : (
    <span className="text-[11px] px-1.5 py-0.5 bg-[#FBEAEA] text-[#C0392B]">Not published</span>
  )
}

function Composer({
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus,
}: {
  placeholder: string
  submitLabel: string
  onSubmit: (body: string) => Promise<void>
  onCancel?: () => void
  autoFocus?: boolean
}) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    const body = draft.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      await onSubmit(body)
      setDraft('')
    } finally {
      setBusy(false)
    }
  }
  return (
    <form
      className="flex flex-col gap-3 border border-[#e1e1e1] bg-white px-4 py-3"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <textarea
        rows={3}
        value={draft}
        maxLength={MAX}
        autoFocus={autoFocus}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-none text-sm leading-relaxed text-[#10182B] outline-none placeholder:text-[#8E8E8E]"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-[#8E8E8E]">Comments are reviewed before they appear. {draft.length > MAX - 200 ? `${MAX - draft.length} characters left.` : ''}</p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="text-xs px-3 py-1.5 text-[#4B4B4B] hover:bg-[#F5F4F0]">Cancel</button>
          )}
          <button
            type="submit"
            disabled={!draft.trim() || busy}
            className="text-xs px-4 py-1.5 bg-[#D8A559] text-[#10182B] hover:bg-[#D1903E] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Posting…' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}

function CommentItem({
  comment,
  canReply,
  onReply,
  isReply = false,
}: {
  comment: BlogComment
  canReply: boolean
  onReply: (parentId: string, body: string) => Promise<void>
  isReply?: boolean
}) {
  const [replying, setReplying] = useState(false)
  return (
    <div className={`flex flex-col gap-2 ${isReply ? '' : 'py-5'}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="flex size-6 items-center justify-center rounded-full bg-[#F5F4F0] text-[11px] text-[#4B4B4B]" aria-hidden>
          {comment.display_name.slice(0, 1).toUpperCase()}
        </span>
        <span className="text-[#10182B]">{comment.display_name}</span>
        {comment.created_at && <span className="text-[#8E8E8E]">{formatDate(comment.created_at)}</span>}
        <StatusNote c={comment} />
      </div>
      <p className="text-sm leading-relaxed text-[#10182B] whitespace-pre-wrap">{comment.body}</p>

      {!isReply && canReply && comment.status === 'approved' && (
        <button
          type="button"
          onClick={() => setReplying((v) => !v)}
          className="flex w-fit items-center gap-1 text-xs text-[#4B4B4B] hover:text-[#A25F2C]"
        >
          <MessageSquare size={14} strokeWidth={1.5} /> Reply
        </button>
      )}
      {replying && (
        <div className="mt-1">
          <Composer
            autoFocus
            placeholder={`Reply to ${comment.display_name}…`}
            submitLabel="Reply"
            onCancel={() => setReplying(false)}
            onSubmit={async (body) => {
              await onReply(comment.id, body)
              setReplying(false)
            }}
          />
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 flex flex-col gap-4 border-l border-[#e8e4dc] pl-6">
          {comment.replies.map((r) => (
            <CommentItem key={r.id} comment={r} canReply={false} onReply={onReply} isReply />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommentsSection({ slug }: { slug: string }) {
  const { customer, loading: authLoading } = useAuth()
  const [comments, setComments] = useState<BlogComment[] | null>(null)
  const [count, setCount] = useState(0)
  const [unavailable, setUnavailable] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await listBlogComments(slug)
      setComments(data.comments)
      setCount(data.count)
      setUnavailable(false)
    } catch (err: unknown) {
      // 404 = the backend doesn't have the comments routes yet; hide the section quietly.
      setComments([])
      setUnavailable((err as { status?: number })?.status === 404)
    }
  }, [slug])

  // Reload once auth settles so a signed-in reader sees their own pending comments.
  useEffect(() => {
    if (authLoading) return
    load()
  }, [load, authLoading, customer?.id])

  const post = async (body: string, parentId?: string) => {
    try {
      await postBlogComment(slug, body, parentId)
      toast.success('Thanks! Your comment will appear once it has been reviewed.')
      await load()
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string }
      toast.error(e?.status === 401 ? 'Please sign in to comment.' : e?.message || 'Could not post your comment.')
      throw err
    }
  }

  if (unavailable) return null

  return (
    <section>
      <h2 className="text-2xl mb-2" style={{ fontFamily: "'Henry Trial', serif" }}>
        Comments{count > 0 ? ` (${count})` : ''}
      </h2>

      {comments === null ? (
        <p className="text-sm text-[#8E8E8E]">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[#4B4B4B] mb-6">No comments yet. Be the first.</p>
      ) : (
        <div className="divide-y divide-[#e8e4dc] mb-6">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} canReply={!!customer} onReply={(pid, body) => post(body, pid)} />
          ))}
        </div>
      )}

      {customer ? (
        <Composer placeholder="Write your comment…" submitLabel="Post comment" onSubmit={(body) => post(body)} />
      ) : (
        <p className="text-sm text-[#4B4B4B]">
          <Link href={`/login?next=/blog/${slug}`} className="underline">Sign in</Link> to join the conversation.
        </p>
      )}
    </section>
  )
}
