import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { isMarketOpen, isInTradingWindow, istTimeString } from '@/lib/time'
import { DEFAULT_TRADING_WINDOWS } from '@/lib/constants'
import type { Signal, TradingWindow } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = Date.now()

    // Fetch all signal keys
    const [intradayKeys, deliveryKeys] = await Promise.all([
      redis.keys('signal:INTRADAY:*'),
      redis.keys('signal:DELIVERY:*'),
    ])

    async function fetchSignals(keys: string[]): Promise<Signal[]> {
      if (keys.length === 0) return []
      const raw = await Promise.all(keys.map(k => redis.get<string>(k)))
      return raw
        .filter((v): v is string => v !== null)
        .map(v => {
          const s = typeof v === 'string' ? JSON.parse(v) : v
          const ageMs = now - new Date(s.receivedAt).getTime()
          return { ...s, signalAgeMinutes: Math.floor(ageMs / 60000) }
        })
        .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    }

    const [intraday, delivery] = await Promise.all([
      fetchSignals(intradayKeys),
      fetchSignals(deliveryKeys),
    ])

    const rawWindows = await redis.get<TradingWindow[]>('trading:windows')
    const windows: TradingWindow[] = rawWindows ?? DEFAULT_TRADING_WINDOWS

    return NextResponse.json({
      intraday,
      delivery,
      marketOpen:      isMarketOpen(),
      inActiveWindow:  isInTradingWindow(windows),
      lastRefreshed:   istTimeString(),
      windows,
    })
  } catch (err) {
    console.error('Signals error:', err)
    return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 })
  }
}
