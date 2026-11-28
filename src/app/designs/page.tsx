'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Shell from '@/components/Shell'
import { useAuth } from '@/context/AuthContext'
import { formatDate } from '@/lib/format'
import DesignTabs from '@/components/DesignTabs'
import { DESIGN_MODES, type DesignModeKey, roomTypeLabel } from '@/lib/designModes'

type Design = {
  design_id: string
  mode: DesignModeKey
  design_type: string
  design_style: string | null
  created_at: string
  status: string
  name: string | null
  preview: string | null
}
type Room = {
  room_id: string
  name: string | null
  room_type: string
  created_at: string
  cover_url: string | null
  ready: boolean
  build_state: string | null
  designs_supported: boolean
  designs: Design[]
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', PREPARING: 'Preparing', RUNNING: 'AI is designing', COMPLETE: 'Complete', FAILED: 'Failed',
}
const BUILD_LABEL: Record<string, string> = {
  UPLOADING: 'Uploading', NOT_BUILT: 'Not built yet', QUEUED: 'Waiting to build', BUILDING: 'Building the 3D room', FAILED: 'Build failed',
}
// A design can be opened once it has a scene: COMPLETE, or a manual draft.
const openable = (d: Design) => d.status === 'COMPLETE' || (d.status === 'DRAFT' && d.design_type === 'manual')
const roomName = (r: Room) => r.name || roomTypeLabel(r.room_type)
const href = (q: Record<string, string | undefined>) => {
  const s = new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][]).toString()
  return s ? `/designs?${s}` : '/designs'
}

function Cover({ src, label, children }: { src: string | null; label?: string; children?: React.ReactNode }) {
  return (
    <div className="aspect-[4/3] bg-[#F5F4F0] overflow-hidden relative">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-[#8E8E8E] px-4 text-center">{label}</div>
      )}
      {children}
    </div>
  )
}

function Crumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <p className="text-xs text-[#8E8E8E] mb-6">
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && ' / '}
          {it.href ? <Link href={it.href} className="hover:text-[#10182B]">{it.label}</Link> : <span className="text-[#10182B]">{it.label}</span>}
        </span>
      ))}
    </p>
  )
}

function DesignsBrowser() {
  const { customer, token, loading } = useAuth()
  const params = useSearchParams()
  const type = params.get('type') ?? undefined
  const roomId = params.get('room') ?? undefined
  const modeParam = params.get('mode') as DesignModeKey | null
  const [rooms, setRooms] = useState<Room[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    fetch('/api/designs', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.message || 'Could not load your rooms.')
        return r.json()
      })
      .then((d) => setRooms(d.rooms ?? []))
      .catch((e) => setError(e.message))
  }, [token])

  if (loading) return <p className="text-sm">Loading…</p>
  if (!customer) return <p className="text-sm text-[#4B4B4B]"><Link href="/login?next=/designs" className="underline">Sign in</Link> with the account you use in the app.</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (rooms === null) {
    return (
      <div>
        <p className="text-sm text-[#4B4B4B] mb-4">Loading your rooms…</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[4/3] bg-[#F5F4F0] animate-pulse" />)}</div>
      </div>
    )
  }
  if (rooms.length === 0) {
    return (
      <div className="bg-[#FCF9F2] p-8 text-sm text-[#4B4B4B]">
        <p>No rooms yet. Scanning a room is the one thing that needs your phone:</p>
        <ol className="list-decimal ml-5 mt-3 space-y-1">
          <li>Open the Philo Homes app and sign in with this account.</li>
          <li>Add a room: scan or record it, and wait for its 3D model.</li>
          <li>Design it in the app — the room and its designs show up here.</li>
        </ol>
      </div>
    )
  }

  // 3. One room: its designs by mode.
  const room = roomId ? rooms.find((r) => r.room_id === roomId) : undefined
  if (room) {
    const typeLabel = roomTypeLabel(room.room_type)
    const counts = Object.fromEntries(DESIGN_MODES.map((m) => [m.key, room.designs.filter((d) => d.mode === m.key).length]))
    const mode = modeParam && counts[modeParam] !== undefined ? modeParam : DESIGN_MODES.find((m) => counts[m.key] > 0)?.key ?? 'whole'
    const info = DESIGN_MODES.find((m) => m.key === mode)!
    const list = room.designs.filter((d) => d.mode === mode)
    return (
      <>
        <Crumbs items={[{ label: 'My Designs', href: '/designs' }, { label: typeLabel, href: href({ type: room.room_type }) }, { label: roomName(room) }]} />
        <h2 className="text-2xl mb-1" style={{ fontFamily: "'Henry Trial', serif" }}>{roomName(room)}</h2>
        <p className="text-sm text-[#4B4B4B] mb-6">{typeLabel} · {room.designs.length} design{room.designs.length === 1 ? '' : 's'}</p>
        {!room.ready ? (
          <p className="text-sm text-[#4B4B4B] bg-[#FCF9F2] p-6">This room&apos;s 3D model isn&apos;t ready yet ({BUILD_LABEL[room.build_state ?? ''] ?? 'in progress'}). Designs show up once it is built.</p>
        ) : !room.designs_supported ? (
          <p className="text-sm text-[#4B4B4B] bg-[#FCF9F2] p-6">Designs for {typeLabel.toLowerCase()} rooms are coming soon. You can view this room in the app.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-2">
              {DESIGN_MODES.map((m) => (
                <Link
                  key={m.key}
                  href={href({ type: room.room_type, room: room.room_id, mode: m.key })}
                  replace
                  scroll={false}
                  className={`px-4 py-2 text-sm border ${m.key === mode ? 'bg-[#10182B] text-white border-[#10182B]' : 'border-[#e1e1e1] hover:border-[#10182B]'}`}
                >
                  {m.label} <span className={m.key === mode ? 'text-white/70' : 'text-[#8E8E8E]'}>{counts[m.key]}</span>
                </Link>
              ))}
            </div>
            <p className="text-xs text-[#8E8E8E] mb-6">{info.blurb}</p>
            {list.length === 0 ? (
              <p className="text-sm text-[#4B4B4B] bg-[#FCF9F2] p-6">No {info.label} designs for this room yet. In the Philo Homes app, open this room and tap <b>{info.label}</b> — the design shows up here.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {list.map((d) => (
                  <Link key={d.design_id} href={openable(d) ? `/designs/${d.design_id}` : '#'} className={`group block ${!openable(d) ? 'cursor-default' : ''}`}>
                    <Cover src={d.preview} label={d.status === 'FAILED' ? 'This design failed to generate.' : openable(d) ? 'Open to view in 3D' : `${STATUS_LABEL[d.status] ?? d.status}…`}>
                      <span className={`absolute top-2 left-2 text-[10px] uppercase tracking-wider px-2 py-0.5 ${d.status === 'COMPLETE' ? 'bg-white/90' : d.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-[#E5C68C]'}`}>
                        {STATUS_LABEL[d.status] ?? d.status}
                      </span>
                    </Cover>
                    <p className="text-sm mt-2">{d.name || d.design_style || info.label}</p>
                    <p className="text-xs text-[#8E8E8E]">{[d.name ? d.design_style : null, formatDate(d.created_at)].filter(Boolean).join(' · ')}</p>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </>
    )
  }

  // 2. One room type: its rooms.
  if (type) {
    const ofType = rooms.filter((r) => r.room_type === type)
    return (
      <>
        <Crumbs items={[{ label: 'My Designs', href: '/designs' }, { label: roomTypeLabel(type) }]} />
        {ofType.length === 0 ? (
          <p className="text-sm text-[#4B4B4B]">No {roomTypeLabel(type).toLowerCase()} rooms. <Link href="/designs" className="underline">All rooms</Link></p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {ofType.map((r) => (
              <Link key={r.room_id} href={href({ type, room: r.room_id })} className="group block">
                <Cover src={r.cover_url} label={r.ready ? 'No picture yet' : BUILD_LABEL[r.build_state ?? ''] ?? 'In progress'}>
                  {!r.ready && <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#E5C68C]">{BUILD_LABEL[r.build_state ?? ''] ?? 'In progress'}</span>}
                </Cover>
                <p className="text-sm mt-2">{roomName(r)}</p>
                <p className="text-xs text-[#8E8E8E]">{r.designs_supported ? `${r.designs.length} design${r.designs.length === 1 ? '' : 's'}` : 'Designs coming soon'} · {formatDate(r.created_at)}</p>
              </Link>
            ))}
          </div>
        )}
      </>
    )
  }

  // 1. Room types.
  const types = Array.from(new Set(rooms.map((r) => r.room_type)))
  return (
    <>
      <p className="text-sm text-[#4B4B4B] mb-8">Rooms you scanned in the Philo Homes app. Pick a room type, then a room, then the kind of design.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {types.map((t) => {
          const ofType = rooms.filter((r) => r.room_type === t)
          const cover = ofType.find((r) => r.cover_url)?.cover_url ?? null
          const designs = ofType.reduce((n, r) => n + r.designs.length, 0)
          return (
            <Link key={t} href={href({ type: t })} className="group block">
              <Cover src={cover} label={roomTypeLabel(t)} />
              <p className="text-sm mt-2">{roomTypeLabel(t)}</p>
              <p className="text-xs text-[#8E8E8E]">{ofType.length} room{ofType.length === 1 ? '' : 's'} · {designs} design{designs === 1 ? '' : 's'}</p>
            </Link>
          )
        })}
      </div>
    </>
  )
}

export default function DesignsPage() {
  return (
    <Shell wide>
      <DesignTabs active="recent" />
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <DesignsBrowser />
      </Suspense>
    </Shell>
  )
}
