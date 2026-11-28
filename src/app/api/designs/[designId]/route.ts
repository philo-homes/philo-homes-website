/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { deleteDesign, designStyle, getDesign, getRoom, PipelineError, renameDesign } from '@/lib/designs'

export const dynamic = 'force-dynamic'

// The rooms API checks the caller owns the design (403/404 otherwise); these
// routes only forward the customer's token and reshape the answer.
const tokenOf = (req: NextRequest) => req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null
const fail = (e: any) => {
  const status = e instanceof PipelineError ? e.status : 502
  const message = status === 401 ? 'Sign in first.' : status === 403 || status === 404 ? 'Design not found.' : 'Could not reach the design service.'
  return NextResponse.json({ message }, { status: status === 403 ? 404 : status })
}

// GET /api/designs/:designId — the design, its scene and its room.
export async function GET(req: NextRequest, ctx: { params: Promise<{ designId: string }> }) {
  const { designId } = await ctx.params
  const token = tokenOf(req)
  if (!token) return NextResponse.json({ message: 'Sign in first.' }, { status: 401 })
  try {
    const design = await getDesign(token, designId)
    if (design.status === 'DELETED') return NextResponse.json({ message: 'Design not found.' }, { status: 404 })
    const room = await getRoom(token, design.room_id).catch(() => null)
    // The capture the design was made on (a rescan may have replaced it since).
    const cap = room?.captures?.find((c) => c.task_id === design.task_id) ?? (room?.current_capture?.task_id === design.task_id ? room.current_capture : null)
    return NextResponse.json({
      design_id: design.design_id,
      status: design.status,
      name: design.name,
      design_type: design.design_type,
      design_style: designStyle(design),
      error: design.error_info,
      created_at: design.created_at,
      render_urls: design.render_urls ?? [],
      // The room GLB goes through /api/room-glb (its bucket has no CORS rule).
      scene: design.scene ? { ...design.scene, roomUrl: design.scene.roomUrl && `/api/room-glb?u=${encodeURIComponent(design.scene.roomUrl)}` } : null,
      room: room && {
        room_id: room.room_id,
        name: room.name,
        room_type: room.room_type,
        room_length: cap?.room_length ?? null,
        room_width: cap?.room_width ?? null,
      },
    })
  } catch (e) {
    return fail(e)
  }
}

// PATCH /api/designs/:designId { name } — rename (the app shows the same name).
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ designId: string }> }) {
  const { designId } = await ctx.params
  const token = tokenOf(req)
  if (!token) return NextResponse.json({ message: 'Sign in first.' }, { status: 401 })
  const name = String((await req.json().catch(() => ({})))?.name ?? '').trim()
  if (!name) return NextResponse.json({ message: 'Name is empty.' }, { status: 400 })
  try {
    const d = await renameDesign(token, designId, name)
    return NextResponse.json({ name: d.name })
  } catch (e: any) {
    if (e instanceof PipelineError && (e.status === 409 || e.status === 422)) {
      return NextResponse.json({ message: e.status === 409 ? 'Another design already has that name.' : 'That name is not allowed.' }, { status: e.status })
    }
    return fail(e)
  }
}

// DELETE /api/designs/:designId — soft delete (gone from the app too).
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ designId: string }> }) {
  const { designId } = await ctx.params
  const token = tokenOf(req)
  if (!token) return NextResponse.json({ message: 'Sign in first.' }, { status: 401 })
  try {
    await deleteDesign(token, designId)
    return NextResponse.json({ success: true })
  } catch (e) {
    return fail(e)
  }
}
