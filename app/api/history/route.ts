import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const raw = await redis.lrange('signal:archive', 0, 499)
    const entries = raw
      .map(v => {
        try { return typeof v === 'string' ? JSON.parse(v) : v }
        catch { return null }
      })
      .filter(Boolean)
    return NextResponse.json({ entries })
  } catch (err) {
    console.error('History error:', err)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
