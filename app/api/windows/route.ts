import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { DEFAULT_TRADING_WINDOWS } from '@/lib/constants'

export async function GET() {
  const windows = await redis.get('trading:windows') ?? DEFAULT_TRADING_WINDOWS
  return NextResponse.json({ windows })
}

export async function POST(req: NextRequest) {
  const { windows } = await req.json()
  await redis.set('trading:windows', JSON.stringify(windows))
  return NextResponse.json({ success: true })
}
