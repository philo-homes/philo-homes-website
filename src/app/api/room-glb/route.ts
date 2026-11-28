import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/room-glb?u=<presigned S3 URL> — streams a room GLB to the browser.
// The rooms API hands out presigned URLs on the room-generator buckets, which
// have no CORS rule (the app loads them in a WebView, where that doesn't
// matter), so a browser page can't fetch them directly. Only those buckets are
// allowed: the presigned URL is the credential, this route just carries it.
const ALLOWED_HOST = /^room-generator-[a-z0-9-]+\.s3(\.[a-z0-9-]+)?\.amazonaws\.com$/

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('u')
  let url: URL
  try {
    url = new URL(raw ?? '')
  } catch {
    return NextResponse.json({ message: 'Bad URL.' }, { status: 400 })
  }
  if (url.protocol !== 'https:' || !ALLOWED_HOST.test(url.hostname) || !url.searchParams.has('X-Amz-Signature')) {
    return NextResponse.json({ message: 'URL not allowed.' }, { status: 400 })
  }
  const upstream = await fetch(url, { cache: 'no-store' }).catch(() => null)
  if (!upstream?.ok || !upstream.body) return NextResponse.json({ message: 'Could not load the room.' }, { status: upstream?.status === 403 ? 403 : 502 })
  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'model/gltf-binary',
      ...(upstream.headers.get('content-length') ? { 'Content-Length': upstream.headers.get('content-length')! } : {}),
      'Cache-Control': 'private, max-age=600',
    },
  })
}
