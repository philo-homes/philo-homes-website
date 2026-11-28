/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { customerFromToken, designPreview, designStyle, listDesigns, listRooms } from '@/lib/designs'
import { designMode, designsSupported } from '@/lib/designModes'

export const dynamic = 'force-dynamic'

// GET /api/designs — the signed-in customer's rooms (the app's Rooms: room type
// → room → designs), each with the designs on its current capture, newest
// first, and the mode that made each (the app's five modes).
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null
  const customer = await customerFromToken(token)
  if (!token || !customer) return NextResponse.json({ message: 'Sign in to see your designs.' }, { status: 401 })

  const startedAt = Date.now()
  let rooms
  try {
    rooms = await listRooms(token, customer.id)
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'Could not load your rooms.' }, { status: 502 })
  }

  const out = await Promise.all(
    rooms.map(async (room) => {
      const ready = !!room.current_capture
      const designs = ready && designsSupported(room.room_type) ? await listDesigns(token, room.current_capture!.task_id).catch(() => []) : []
      return {
        room_id: room.room_id,
        name: room.name,
        room_type: room.room_type,
        created_at: room.created_at,
        cover_url: room.cover_url,
        ready,
        build_state: room.build_state ?? (ready ? 'READY' : null),
        designs_supported: designsSupported(room.room_type),
        designs: designs
          // Like the app: a single-item run whose candidates were never picked and
          // saved (no scene) — incl. Add a piece suggestions — is not a design of theirs.
          .filter((d) => d.status !== 'DELETED' && !(d.design_type === 'single_item' && !d.scene_url))
          .map((d) => ({
            design_id: d.design_id,
            mode: designMode(d),
            design_type: d.design_type,
            design_style: designStyle(d),
            created_at: d.created_at,
            status: d.status,
            name: d.name,
            preview: designPreview(d) ?? room.cover_url,
          }))
          .filter((d) => d.mode)
          .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')),
      }
    }),
  )
  out.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  console.log(`[designs] customer=${customer.id} rooms=${out.length} designs=${out.reduce((n, r) => n + r.designs.length, 0)} in ${Date.now() - startedAt}ms`)
  return NextResponse.json({ rooms: out })
}
