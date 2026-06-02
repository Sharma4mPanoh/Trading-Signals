import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { INTRADAY_TTL, DELIVERY_TTL } from '@/lib/constants'

export async function POST(req: NextRequest) {
  try {
    const { symbol, module: mod, entryPrice, stopLoss, targetPrice } = await req.json()
    if (!symbol || !mod) {
      return NextResponse.json({ error: 'symbol and module required' }, { status: 400 })
    }

    const key = `signal:${mod}:${symbol.toUpperCase()}`
    const existing = await redis.get<string>(key)
    if (!existing) {
      return NextResponse.json({ error: 'Signal not found or expired' }, { status: 404 })
    }

    const signal = typeof existing === 'string' ? JSON.parse(existing) : existing
    const updated = {
      ...signal,
      entryPrice:  entryPrice  ?? signal.entryPrice,
      stopLoss:    stopLoss    ?? signal.stopLoss,
      targetPrice: targetPrice ?? signal.targetPrice,
    }

    // Preserve remaining TTL — re-set with original TTL type
    const ttl = mod === 'INTRADAY' ? INTRADAY_TTL : DELIVERY_TTL
    // Get remaining TTL from Redis
    const remaining = await redis.ttl(key)
    const ex = remaining > 0 ? remaining : ttl

    await redis.set(key, JSON.stringify(updated), { ex })
    return NextResponse.json({ success: true, signal: updated })
  } catch (err) {
    console.error('Patch error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
