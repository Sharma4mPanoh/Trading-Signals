import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

function getISTDateKey(): string {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  const y = ist.getUTCFullYear()
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0')
  const d = String(ist.getUTCDate()).padStart(2, '0')
  return `checklist:${y}-${m}-${d}`
}

export async function GET() {
  try {
    const key = getISTDateKey()
    const data = await redis.get<Record<string, boolean>>(key)
    return NextResponse.json({ state: data ?? {}, date: key })
  } catch (e) {
    console.error('Checklist GET error:', e)
    return NextResponse.json({ state: {}, date: getISTDateKey() })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Record<string, boolean>
    const key = getISTDateKey()
    // TTL: 30 hours — resets fresh each trading day
    await redis.set(key, body, { ex: 30 * 60 * 60 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Checklist POST error:', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
