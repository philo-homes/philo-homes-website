import { NextRequest, NextResponse } from 'next/server'
import { listCatalog } from '@/lib/designs'

export const dynamic = 'force-dynamic'

// GET /api/catalog?q=&room_type= — shop pieces with a 3D model, to place in a
// design (the rooms API catalog the app's "Arrange myself" uses).
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null
  if (!token) return NextResponse.json({ message: 'Sign in first.' }, { status: 401 })
  const sp = req.nextUrl.searchParams
  try {
    const r = await listCatalog(token, { q: sp.get('q') ?? undefined, room_type: sp.get('room_type') ?? undefined, limit: 200 })
    return NextResponse.json(r)
  } catch {
    return NextResponse.json({ message: 'Could not load the catalog.' }, { status: 502 })
  }
}
