/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { PipelineError, putScene } from '@/lib/designs'

export const dynamic = 'force-dynamic'

// PUT /api/designs/:designId/scene { base_version, scene: { furnitureUrls, hiddenRoomNodes } }
// Saves the design as changed in the 3D view (its next version), like the app's
// "Save changes". The app shows the same design afterwards.
export async function PUT(req: NextRequest, ctx: { params: Promise<{ designId: string }> }) {
  const { designId } = await ctx.params
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null
  if (!token) return NextResponse.json({ message: 'Sign in first.' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const scene = body?.scene
  if (!Number.isInteger(body?.base_version) || !Array.isArray(scene?.furnitureUrls) || !Array.isArray(scene?.hiddenRoomNodes)) {
    return NextResponse.json({ message: 'Bad request.' }, { status: 400 })
  }
  try {
    const d = await putScene(token, designId, body.base_version, { furnitureUrls: scene.furnitureUrls, hiddenRoomNodes: scene.hiddenRoomNodes })
    return NextResponse.json({ version: d.version ?? body.base_version + 1 })
  } catch (e: any) {
    if (!(e instanceof PipelineError)) return NextResponse.json({ message: 'Could not reach the design service.' }, { status: 502 })
    let code: string | undefined
    let detail: string | undefined
    try {
      const parsed = JSON.parse(e.body)
      code = parsed?.detail?.code ?? parsed?.code
      detail = typeof parsed?.detail === 'string' ? parsed.detail : parsed?.detail?.message
    } catch {}
    const message =
      e.status === 409
        ? code === 'RENDER_RUNNING'
          ? 'Photos of this design are being rendered. Save again when they are done.'
          : 'This design was changed somewhere else (in the app?) since you opened it. Reload to see the latest version.'
        : e.status === 422
          ? detail || 'A piece is outside the room.'
          : e.status === 404 || e.status === 403
            ? 'Design not found.'
            : 'Could not save the design.'
    return NextResponse.json({ message, code }, { status: e.status === 403 ? 404 : e.status })
  }
}
