import { NextRequest, NextResponse } from 'next/server'
import { MEDUSA_PUBLISHABLE_KEY, MEDUSA_URL } from '@/lib/config'

export const dynamic = 'force-dynamic'

// A long-lived dev server can hold dead keep-alive sockets after the machine
// sleeps; the first attempt then fails with "fetch failed". One retry on a
// fresh connection fixes that without the user seeing an error.
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch (first) {
    const msg = String((first as Error)?.message ?? first)
    if (!/fetch failed|ECONNRESET|ETIMEDOUT|socket/i.test(msg)) throw first
    return fetch(url, { ...init, headers: { ...(init.headers as Record<string, string>), connection: 'close' } })
  }
}

// Same-origin proxy for the Medusa store/auth API. The browser only ever talks
// to this site, so the backend's CORS allow-list (which doesn't include our
// origins) never gets in the way. Forwards method, body, query string and the
// customer's bearer token; adds the publishable key server-side.
async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const target = `${MEDUSA_URL}/${path.join('/')}${req.nextUrl.search}`
  const headers: Record<string, string> = {
    'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
    accept: 'application/json',
  }
  const auth = req.headers.get('authorization')
  if (auth) headers.authorization = auth
  const contentType = req.headers.get('content-type')
  if (contentType) headers['content-type'] = contentType

  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text()
  let upstream: Response
  try {
    upstream = await fetchWithRetry(target, { method: req.method, headers, body: body || undefined, cache: 'no-store' })
  } catch (error: unknown) {
    return NextResponse.json({ message: `Backend unreachable: ${(error as Error)?.message ?? error}` }, { status: 502 })
  }
  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE }
