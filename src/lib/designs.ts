/* eslint-disable @typescript-eslint/no-explicit-any */
// Server-side helpers for the pipeline v2 rooms API (the same API the app uses
// for Rooms and designs). Never imported by client components — see
// src/app/api/designs/*. Every call forwards the customer's Medusa token; the
// API checks that the caller owns the user, room or design in the path.
import { MEDUSA_PUBLISHABLE_KEY, MEDUSA_URL, PIPELINE_API } from './config'

/** One piece in a design's scene.json (catalog sku; centimetres, pipeline frame, Z-up). */
export type FurnitureItem = {
  id: string
  name?: string
  price?: number | null
  image?: string | null
  url: string
  position: number[]
  rotation: number[]
  scale: number[]
}
export type SceneJson = { roomUrl: string | null; furnitureUrls: FurnitureItem[]; hiddenRoomNodes?: number[] }

/** One piece the room came with (the capture's room/furniture.json). */
export type RoomFurniturePiece = { node: number; name: string; category: string; group: string; image_url: string | null }

export type CaptureSummary = {
  task_id: string
  status: string
  room_glb: string | null
  room_length: number | null
  room_width: number | null
  room_height: number | null
}
export type RoomRecord = {
  room_id: string
  room_type: string
  name: string | null
  created_at: string
  cover_url: string | null
  current_capture: CaptureSummary | null
  design_count: number
  /** READY, UPLOADING, NOT_BUILT, QUEUED, BUILDING or FAILED (absent on an older backend). */
  build_state?: string
  /** GET /v1/rooms/{id} only: every capture, newest first. */
  captures?: CaptureSummary[]
}
export type Design = {
  design_id: string
  task_id: string
  room_id: string
  design_type: 'whole_room' | 'single_item' | 'manual' | string
  status: 'DRAFT' | 'PREPARING' | 'RUNNING' | 'COMPLETE' | 'FAILED' | 'DELETED' | string
  name: string | null
  request: Record<string, any> | null
  created_at: string
  completed_at: string | null
  scene_url: string | null
  render_urls: string[] | null
  thumbnail_url: string | null
  scene?: SceneJson | null
  error_info: string | null
  /** single_item only: the candidates; `mode` says add or replace. */
  result?: { mode?: string } | null
  /** scene.json's version; every save sends it back as base_version. */
  version?: number
  render_status?: string | null
}

/** GET /v1/catalog/furniture: shop items with a 3D model, for placing by hand. */
export type CatalogItem = {
  sku: string
  name: string
  category: string
  price: number | null
  original_price: number | null
  image_url: string | null
  model_3d_url: string
}

export class PipelineError extends Error {
  constructor(message: string, public status: number, public body = '') {
    super(message)
  }
}

const withTimeout = async (url: string, ms: number, init?: RequestInit) => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: c.signal, cache: 'no-store' })
  } finally {
    clearTimeout(t)
  }
}

// Who is calling? Resolve the bearer token to a Medusa customer: the rooms API
// is keyed by the Medusa customer id.
export async function customerFromToken(token: string | null): Promise<{ id: string; email: string; metadata?: Record<string, any> | null } | null> {
  if (!token) return null
  const res = await withTimeout(`${MEDUSA_URL}/store/customers/me`, 15000, {
    headers: { 'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.customer ?? null
}

async function call<T>(token: string, method: 'GET' | 'PATCH' | 'PUT' | 'DELETE', path: string, body?: unknown, ms = 30000): Promise<T> {
  const res = await withTimeout(`${PIPELINE_API}${path}`, ms, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) {
    console.warn('[rooms-api]', method, path, res.status, text.slice(0, 300))
    throw new PipelineError(`${method} ${path} failed: ${res.status}`, res.status, text)
  }
  return (text ? JSON.parse(text) : {}) as T
}

const enc = encodeURIComponent

export const listRooms = (token: string, userId: string) =>
  call<{ rooms: RoomRecord[] }>(token, 'GET', `/v1/users/${enc(userId)}/rooms`).then((r) => r.rooms ?? [])

export const getRoom = (token: string, roomId: string) => call<RoomRecord>(token, 'GET', `/v1/rooms/${enc(roomId)}`)

/** Designs on one capture (a room's current one), newest first. */
export const listDesigns = (token: string, taskId: string) =>
  call<{ designs: Design[] }>(token, 'GET', `/v1/captures/${enc(taskId)}/designs`, undefined, 60000).then((r) => r.designs ?? [])

/** One design; its `scene` is scene.json with roomUrl signed. */
export const getDesign = (token: string, designId: string) => call<Design>(token, 'GET', `/v1/designs/${enc(designId)}`)

/** GET /v1/captures/{task_id}: room_furniture is the room's own pieces (null until prepared). */
export const getCapture = (token: string, taskId: string) =>
  call<CaptureSummary & { room_furniture: RoomFurniturePiece[] | null }>(token, 'GET', `/v1/captures/${enc(taskId)}`, undefined, 15000)

/** PUT /v1/designs/{id}/scene: the design's next version. 409 when base_version is stale. */
export const putScene = (token: string, designId: string, baseVersion: number, scene: Pick<SceneJson, 'furnitureUrls' | 'hiddenRoomNodes'>) =>
  call<Design>(token, 'PUT', `/v1/designs/${enc(designId)}/scene`, { base_version: baseVersion, scene })

export const listCatalog = (token: string, params: { q?: string; room_type?: string; limit?: number }) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString()
  return call<{ items: CatalogItem[]; total: number }>(token, 'GET', `/v1/catalog/furniture${qs ? `?${qs}` : ''}`)
}

export const renameDesign = (token: string, designId: string, name: string) =>
  call<Design>(token, 'PATCH', `/v1/designs/${enc(designId)}`, { name })

export const deleteDesign = (token: string, designId: string) => call<unknown>(token, 'DELETE', `/v1/designs/${enc(designId)}`)

/** A design's preview: the customer's own thumbnail, else its first render. */
export const designPreview = (d: Design) => d.thumbnail_url || d.render_urls?.[0] || null

/** A whole-room design's style: a theme name, or the customer's own photo. */
export function designStyle(d: Design): string | null {
  if (d.request?.style?.type === 'custom') return 'Your style'
  return typeof d.request?.design_style === 'string' ? d.request.design_style : null
}
