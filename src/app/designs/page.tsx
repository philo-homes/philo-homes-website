'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Shell from '@/components/Shell'
import { useAuth } from '@/context/AuthContext'
import { formatDate } from '@/lib/format'
import DesignTabs from '@/components/DesignTabs'

type Design = {
  design_id: string
  room_id: string
  room_name: string | null
  room_type: string
  design_type: string
  design_style: string | null
  created_at: string
  status: string
  name: string | null
  preview: string | null
}
type Room = { room_id: string; name: string | null; room_type: string; ready: boolean }

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', PREPARING: 'Preparing', RUNNING: 'AI is designing', COMPLETE: 'Complete', FAILED: 'Failed',
}
const TYPE_LABEL: Record<string, string> = { whole_room: 'Whole room', single_item: 'One piece', manual: 'Arranged by you' }
const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

// A design can be opened once it has a scene: COMPLETE, or a manual draft.
const openable = (d: Design) => d.status === 'COMPLETE' || (d.status === 'DRAFT' && d.design_type === 'manual')

export default function DesignsPage() {
  const { customer, token, loading } = useAuth()
  const [designs, setDesigns] = useState<Design[] | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    fetch('/api/designs', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.message || 'Could not load designs.')
        return r.json()
      })
      .then((d) => {
        setDesigns(d.designs)
        setRooms(d.rooms ?? [])
      })
      .catch((e) => setError(e.message))
  }, [token])

  return (
    <Shell wide>
      <DesignTabs active="recent" />
      <p className="text-sm text-[#4B4B4B] mb-8">Designs of the rooms you scanned in the Philo Homes app. Open one to walk through it, change the furniture and shop the look.</p>
      {loading ? <p className="text-sm">Loading…</p> : !customer ? (
        <p className="text-sm text-[#4B4B4B]"><Link href="/login?next=/designs" className="underline">Sign in</Link> with the account you use in the app.</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : designs === null ? (
        <div>
          <p className="text-sm text-[#4B4B4B] mb-4">Loading your designs…</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[4/3] bg-[#F5F4F0] animate-pulse" />)}</div>
        </div>
      ) : designs.length === 0 ? (
        <div className="bg-[#FCF9F2] p-8 text-sm text-[#4B4B4B]">
          {rooms.some((r) => r.ready) ? (
            <p>Your rooms ({rooms.filter((r) => r.ready).map((r) => r.name || titleCase(r.room_type)).join(', ')}) have no designs yet. Open a room in the Philo Homes app and pick a design mode — finished designs show up here.</p>
          ) : (
            <>
              <p>No designs yet. Scanning a room is the one thing that needs your phone:</p>
              <ol className="list-decimal ml-5 mt-3 space-y-1">
                <li>Open the Philo Homes app and sign in with this account.</li>
                <li>Add a room: scan or record it, and wait for its 3D model.</li>
                <li>Design it in the app — the finished design shows up here automatically.</li>
              </ol>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {designs.map((d) => (
            <Link key={d.design_id} href={openable(d) ? `/designs/${d.design_id}` : '#'} className={`group block ${!openable(d) ? 'cursor-default' : ''}`}>
              <div className="aspect-[4/3] bg-[#F5F4F0] overflow-hidden relative">
                {d.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.preview} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[#8E8E8E] px-4 text-center">
                    {d.status === 'FAILED' ? 'This design failed to generate.' : openable(d) ? 'Open to view in 3D' : `${STATUS_LABEL[d.status] ?? d.status}…`}
                  </div>
                )}
                <span className={`absolute top-2 left-2 text-[10px] uppercase tracking-wider px-2 py-0.5 ${d.status === 'COMPLETE' ? 'bg-white/90' : d.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-[#E5C68C]'}`}>
                  {STATUS_LABEL[d.status] ?? d.status}
                </span>
              </div>
              <p className="text-sm mt-2">{d.name || `${d.room_name || titleCase(d.room_type)}${d.design_style ? ` · ${d.design_style}` : ''}`}</p>
              <p className="text-xs text-[#8E8E8E]">{[d.name ? d.room_name || titleCase(d.room_type) : null, TYPE_LABEL[d.design_type] ?? d.design_type, formatDate(d.created_at)].filter(Boolean).join(' · ')}</p>
            </Link>
          ))}
        </div>
      )}
    </Shell>
  )
}
