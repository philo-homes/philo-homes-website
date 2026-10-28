import { NextResponse } from 'next/server'
import { warmUp } from '@/lib/designs'

export const dynamic = 'force-dynamic'

// GET /api/designs/warm — wakes the Cloud Run design services (no data, no
// auth). Called when a customer signs in so My Designs opens fast.
export async function GET() {
  await warmUp()
  return NextResponse.json({ ok: true })
}
