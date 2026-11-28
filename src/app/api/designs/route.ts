/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { customerFromToken, designPreview, designStyle, listDesigns, listRooms } from '@/lib/designs'

export const dynamic = 'force-dynamic'

// GET /api/designs — the signed-in customer's designs from the rooms API (the
// app's Rooms): every room's current capture, its designs newest first. Rooms
// with a 3D model but no designs yet come back in `rooms` so the page can say so.
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

  const perRoom = await Promise.all(
    rooms
      .filter((r) => r.current_capture)
      .map(async (room) => {
        const designs = await listDesigns(token, room.current_capture!.task_id).catch(() => [])
        return designs
          // Like the app: a single-item run whose candidates were never picked and
          // saved (no scene) — incl. Add a piece suggestions — is not a design of theirs.
          .filter((d) => d.status !== 'DELETED' && !(d.design_type === 'single_item' && !d.scene_url))
          .map((d) => ({
            design_id: d.design_id,
            room_id: room.room_id,
            room_name: room.name,
            room_type: room.room_type,
            design_type: d.design_type,
            design_style: designStyle(d),
            created_at: d.created_at,
            status: d.status,
            name: d.name,
            preview: designPreview(d) ?? room.cover_url,
          }))
      }),
  )
  const designs = perRoom.flat().sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  console.log(`[designs] customer=${customer.id} rooms=${rooms.length} designs=${designs.length} in ${Date.now() - startedAt}ms`)
  return NextResponse.json({
    designs,
    rooms: rooms.map((r) => ({ room_id: r.room_id, name: r.name, room_type: r.room_type, ready: !!r.current_capture, cover_url: r.cover_url })),
  })
}
