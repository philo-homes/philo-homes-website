import { NextRequest, NextResponse } from 'next/server'
import { customerFromToken, deleteTask, fetchFurnitureData, listUserTasks, resolveStatus } from '@/lib/designs'

export const dynamic = 'force-dynamic'

async function authorize(req: NextRequest, taskId: string) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null
  const customer = await customerFromToken(token)
  if (!customer) return { error: NextResponse.json({ message: 'Sign in first.' }, { status: 401 }) }
  // The task must belong to this customer — never serve someone else's room.
  const tasks = await listUserTasks(customer.id).catch(() => [])
  if (!tasks.some((t) => t.task_id === taskId)) {
    return { error: NextResponse.json({ message: 'Design not found.' }, { status: 404 }) }
  }
  return { customer }
}

// GET /api/designs/:taskId — status + result + parsed furniture list.
export async function GET(req: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await ctx.params
  const auth = await authorize(req, taskId)
  if ('error' in auth) return auth.error

  const { status, result } = await resolveStatus(taskId)
  if (status !== 'COMPLETE' || !result) return NextResponse.json({ task_id: taskId, status, result: null, furniture: null })

  const furniture = result.artifacts?.furniture_data ? await fetchFurnitureData(result.artifacts.furniture_data) : null
  return NextResponse.json({ task_id: taskId, status, result, furniture })
}

// DELETE /api/designs/:taskId
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await ctx.params
  const auth = await authorize(req, taskId)
  if ('error' in auth) return auth.error
  const ok = await deleteTask(taskId)
  return NextResponse.json({ success: ok }, { status: ok ? 200 : 502 })
}
