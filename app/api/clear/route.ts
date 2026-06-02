import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

const SECRET = process.env.WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const sec = url.searchParams.get('secret')
  if (SECRET && sec !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const keys = await redis.keys('signal:*')
  if (keys.length > 0) await Promise.all(keys.map(k => redis.del(k)))
  return NextResponse.json({ success: true, cleared: keys.length })
}
