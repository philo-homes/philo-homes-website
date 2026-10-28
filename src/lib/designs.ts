/* eslint-disable @typescript-eslint/no-explicit-any */
// Server-side helpers for the AI design pipeline APIs (Cloud Run). Never
// imported by client components — see src/app/api/designs/*.
import { MEDUSA_PUBLISHABLE_KEY, MEDUSA_URL, TASK_RESULT_API, TASK_STATUS_API } from './config'

export type TaskSummary = { task_id: string; timestamp: string }
export type TaskStatus =
  | 'CREATED' | 'INPUT_UPLOADED' | 'PROCESSING' | 'VIDEO_PROCESSING_RUNNING' | 'VIDEO_PROCESSING_COMPLETE'
  | 'AI_DESIGN_RUNNING' | 'AI_DESIGN_COMPLETE' | 'RENDER_RUNNING' | 'COMPLETE' | 'FAILED' | 'DELETED' | string

export type TaskResult = {
  task_id: string
  status: TaskStatus
  room_type?: string
  design_style?: string
  room_length?: number
  room_width?: number
  room_height?: number
  artifacts: { furniture_data: string; room_glb: string; images: string[] } | null
}

export type FurnitureItem = {
  id: string
  name?: string
  price?: number
  photo_url?: string
  url: string
  position: number[]
  rotation: number[]
  scale: number[]
}
export type FurnitureData = { roomUrl?: string; furnitureUrls: FurnitureItem[] }

const withTimeout = async (url: string, ms: number, init?: RequestInit) => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: c.signal, cache: 'no-store' })
  } finally {
    clearTimeout(t)
  }
}

// Who is calling? Resolve the bearer token to a Medusa customer so a user can
// only ever list THEIR tasks (the pipeline API itself is keyed by user id only).
export async function customerFromToken(token: string | null): Promise<{ id: string; email: string; metadata?: Record<string, any> | null } | null> {
  if (!token) return null
  const res = await withTimeout(`${MEDUSA_URL}/store/customers/me`, 15000, {
    headers: { 'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.customer ?? null
}

export async function listUserTasks(userId: string): Promise<TaskSummary[]> {
  const res = await withTimeout(`${TASK_STATUS_API}/v1/tasks/${encodeURIComponent(userId)}`, COLD_START_MS)
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`task list failed: ${res.status}`)
  const data = await res.json()
  return Array.isArray(data?.tasks) ? data.tasks : []
}

// Cloud Run services cold-start in 12–17s; every timeout below must outlast that.
const COLD_START_MS = 45000

export async function readStatus(taskId: string): Promise<TaskStatus | null> {
  try {
    const res = await withTimeout(`${TASK_STATUS_API}/v1/tasks/${encodeURIComponent(taskId)}/status`, COLD_START_MS)
    if (!res.ok) return null
    const data = await res.json()
    return data?.status ?? null
  } catch {
    return null
  }
}

export async function getResult(taskId: string): Promise<TaskResult | null> {
  const res = await withTimeout(`${TASK_RESULT_API}/v1/tasks/${encodeURIComponent(taskId)}/result`, COLD_START_MS)
  if (!res.ok) return null
  return res.json()
}

// Status with a fallback: if the status service is unreachable, the result
// service also reports the task's status.
export async function resolveStatus(taskId: string): Promise<{ status: TaskStatus; result: TaskResult | null }> {
  const status = await readStatus(taskId)
  if (status && status !== 'COMPLETE') return { status, result: null }
  const result = await getResult(taskId).catch(() => null)
  if (result?.status) return { status: result.status, result }
  return { status: status ?? 'UNKNOWN', result }
}

// Wake both services so the first real request doesn't eat the cold start.
export async function warmUp(): Promise<void> {
  await Promise.allSettled([
    withTimeout(`${TASK_STATUS_API}/`, COLD_START_MS).catch(() => null),
    withTimeout(`${TASK_RESULT_API}/`, COLD_START_MS).catch(() => null),
  ])
}

export async function fetchFurnitureData(signedUrl: string): Promise<FurnitureData | null> {
  try {
    const res = await withTimeout(signedUrl, 15000)
    if (!res.ok) return null
    const data = await res.json()
    return { roomUrl: data.roomUrl, furnitureUrls: Array.isArray(data.furnitureUrls) ? data.furnitureUrls : [] }
  } catch {
    return null
  }
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const res = await withTimeout(`${TASK_STATUS_API}/v1/tasks/${encodeURIComponent(taskId)}/delete`, 30000, { method: 'POST' })
  return res.ok
}
