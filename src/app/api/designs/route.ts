/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { customerFromToken, listUserTasks, resolveStatus } from '@/lib/designs'

export const dynamic = 'force-dynamic'

// GET /api/designs — the signed-in customer's AI designs, newest first, with
// live status and (for finished ones) a preview image. Names come from the
// customer's metadata.design_names, the same map the app writes.
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null
  const customer = await customerFromToken(token)
  if (!customer) return NextResponse.json({ message: 'Sign in to see your designs.' }, { status: 401 })

  let tasks
  try {
    tasks = await listUserTasks(customer.id)
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'Could not load designs.' }, { status: 502 })
  }
  tasks.sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))
  const startedAt = Date.now()

  let names: Record<string, string> = {}
  try {
    const raw = customer.metadata?.design_names
    names = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {}
  } catch {
    names = {}
  }

  const designs = await Promise.all(
    tasks.slice(0, 30).map(async (t) => {
      const { status, result } = await resolveStatus(t.task_id)
      const preview = status === 'COMPLETE' ? result?.artifacts?.images?.[0] ?? null : null
      const room_type = result?.room_type
      const design_style = result?.design_style
      return {
        task_id: t.task_id,
        created_at: t.timestamp,
        status,
        name: names[t.task_id] ?? null,
        preview,
        room_type,
        design_style,
      }
    }),
  )
  console.log(
    `[designs] customer=${customer.id} tasks=${tasks.length} statuses=${designs.map((d) => `${d.task_id}:${d.status}`).join(',') || '-'} in ${Date.now() - startedAt}ms`,
  )
  return NextResponse.json({ designs: designs.filter((d) => d.status !== 'DELETED') })
}
