import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { INTRADAY_SCANS, DELIVERY_SCANS, INTRADAY_TTL, DELIVERY_TTL, ARCHIVE_MAX, SCAN_TRAIL_METHOD, SCAN_DESCRIPTIONS } from '@/lib/constants'
import { isInTradingWindow } from '@/lib/time'
import type { TradingWindow } from '@/lib/types'

const SECRET = process.env.WEBHOOK_SECRET

function isIntraday(scanId: string) { return scanId in INTRADAY_SCANS }
function isDelivery(scanId: string) { return scanId in DELIVERY_SCANS }

export async function GET(req: NextRequest) {
  return handleWebhook(req)
}
export async function POST(req: NextRequest) {
  return handleWebhook(req)
}

async function handleWebhook(req: NextRequest) {
  try {
    const url  = new URL(req.url)
    const scan = url.searchParams.get('scan')?.toUpperCase()
    const sec  = url.searchParams.get('secret')

    if (SECRET && sec !== SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!scan || (!isIntraday(scan) && !isDelivery(scan))) {
      return NextResponse.json({ error: 'Unknown scan ID' }, { status: 400 })
    }

    // Parse symbols from POST body or query param
    let symbols: string[] = []
    const symParam = url.searchParams.get('symbols')
    if (symParam) {
      symbols = symParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    } else {
      try {
        const body = await req.json()
        if (body?.stocks)  symbols = String(body.stocks).split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean)
        if (body?.symbols) symbols = String(body.symbols).split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean)
      } catch { /* GET request or empty body */ }
    }

    if (symbols.length === 0) {
      return NextResponse.json({ error: 'No symbols provided' }, { status: 400 })
    }

    const intraday = isIntraday(scan)
    const module_  = intraday ? 'INTRADAY' : 'DELIVERY'
    const ttl      = intraday ? INTRADAY_TTL : DELIVERY_TTL

    // For intraday: check trading window
    let skipped = 0
    if (intraday) {
      const rawWindows = await redis.get<TradingWindow[]>('trading:windows')
      const windows = rawWindows ?? [
        { start: '09:30', end: '11:00', enabled: true,  label: 'Morning session' },
        { start: '13:00', end: '14:45', enabled: true,  label: 'Afternoon session' },
      ]
      if (!isInTradingWindow(windows)) {
        return NextResponse.json({ success: true, scanId: scan, processed: 0, skipped: symbols.length, reason: 'Outside trading window' })
      }
    }

    const now = new Date().toISOString()
    let processed = 0

    for (const symbol of symbols) {
      const key = `signal:${module_}:${symbol}`
      const signal = {
        symbol,
        scanId:     scan,
        module:     module_,
        receivedAt: now,
        signalAgeMinutes: 0,
        description: SCAN_DESCRIPTIONS[scan] ?? '',
        trailMethod: SCAN_TRAIL_METHOD[scan] ?? 'EMA_20',
        entryPrice:  null,
        stopLoss:    null,
        targetPrice: null,
      }
      await redis.set(key, JSON.stringify(signal), { ex: ttl })
      processed++
    }

    return NextResponse.json({ success: true, scanId: scan, processed, skipped })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
