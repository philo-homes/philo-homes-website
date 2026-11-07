'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Shell from '@/components/Shell'
import { useAuth } from '@/context/AuthContext'
import { formatDate } from '@/lib/format'
import DesignTabs from '@/components/DesignTabs'

type Design = { task_id: string; created_at: string; status: string; name: string | null; preview: string | null; room_type?: string; design_style?: string }

const STATUS_LABEL: Record<string, string> = {
  CREATED: 'Starting…', INPUT_UPLOADED: 'Uploaded', PROCESSING: 'Processing', VIDEO_PROCESSING_RUNNING: 'Building the 3D room',
  VIDEO_PROCESSING_COMPLETE: 'Room ready', AI_DESIGN_RUNNING: 'AI is designing', AI_DESIGN_COMPLETE: 'Design ready',
  RENDER_RUNNING: 'Rendering images', COMPLETE: 'Complete', FAILED: 'Failed', UNKNOWN: 'Unknown',
}

export default function DesignsPage() {
  const { customer, token, loading } = useAuth()
  const [designs, setDesigns] = useState<Design[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    fetch('/api/designs', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.message || 'Could not load designs.')
        return r.json()
      })
      .then((d) => setDesigns(d.designs))
      .catch((e) => setError(e.message))
  }, [token])

  return (
    <Shell wide>
      <DesignTabs active="recent" />
      <p className="text-sm text-[#4B4B4B] mb-8">Rooms you scanned in the Philo Homes app. Open one to walk through it, change the furniture and shop the look.</p>
      {loading ? <p className="text-sm">Loading…</p> : !customer ? (
        <p className="text-sm text-[#4B4B4B]"><Link href="/login?next=/designs" className="underline">Sign in</Link> with the account you use in the app.</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : designs === null ? (
        <div>
          <p className="text-sm text-[#4B4B4B] mb-4">Loading your designs… the first load can take up to 30 seconds while the design service wakes up.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[4/3] bg-[#F5F4F0] animate-pulse" />)}</div>
        </div>
      ) : designs.length === 0 ? (
        <div className="bg-[#FCF9F2] p-8 text-sm text-[#4B4B4B]">
          <p>No designs yet. Scanning a room is the one thing that needs your phone:</p>
          <ol className="list-decimal ml-5 mt-3 space-y-1">
            <li>Open the Philo Homes app and sign in with this account.</li>
            <li>Tap <b>Design</b>, scan or record your room, pick a style.</li>
            <li>Come back here — the finished design shows up automatically.</li>
          </ol>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {designs.map((d) => (
            <Link key={d.task_id} href={d.status === 'COMPLETE' ? `/designs/${d.task_id}` : '#'} className={`group block ${d.status !== 'COMPLETE' ? 'cursor-default' : ''}`}>
              <div className="aspect-[4/3] bg-[#F5F4F0] overflow-hidden relative">
                {d.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.preview} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[#8E8E8E] px-4 text-center">
                    {d.status === 'FAILED' ? 'This design failed to generate.' : `${STATUS_LABEL[d.status] ?? d.status}…`}
                  </div>
                )}
                <span className={`absolute top-2 left-2 text-[10px] uppercase tracking-wider px-2 py-0.5 ${d.status === 'COMPLETE' ? 'bg-white/90' : d.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-[#E5C68C]'}`}>
                  {STATUS_LABEL[d.status] ?? d.status}
                </span>
              </div>
              <p className="text-sm mt-2">{d.name || `${d.room_type ? d.room_type[0].toUpperCase() + d.room_type.slice(1) : 'Room'}${d.design_style ? ` · ${d.design_style}` : ''}`}</p>
              <p className="text-xs text-[#8E8E8E]">{formatDate(d.created_at)}</p>
            </Link>
          ))}
        </div>
      )}
    </Shell>
  )
}
