import { NextRequest, NextResponse } from 'next/server'
import { processWebhook } from '@/lib/logic'
import { ALL_SCAN_IDS } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    // Validate secret
    const secret = process.env.WEBHOOK_SECRET
    if (secret) {
      const incoming = request.nextUrl.searchParams.get('secret')
      if (incoming !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Get scan ID
    const scanId = request.nextUrl.searchParams.get('scan')?.toUpperCase()
    if (!scanId || !ALL_SCAN_IDS.includes(scanId as any)) {
      return NextResponse.json(
        { error: `Invalid scan. Must be one of: ${ALL_SCAN_IDS.join(', ')}` },
        { status: 400 }
      )
    }

    // Parse symbols from body
    let symbols: string[] = []
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      symbols = parseSymbols(body.stocks || body.symbols || body.data || '')
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const form = await request.formData()
      symbols = parseSymbols(form.get('stocks')?.toString() || form.get('symbols')?.toString() || '')
    } else {
      symbols = parseSymbols(await request.text())
    }

    if (symbols.length === 0) {
      return NextResponse.json({ message: 'No symbols in payload', scanId }, { status: 200 })
    }

    const result = await processWebhook(scanId, symbols)

    return NextResponse.json({
      success: true,
      scanId,
      ...result,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// GET for browser testing
export async function GET(request: NextRequest) {
  const scanId = request.nextUrl.searchParams.get('scan')?.toUpperCase()
  const symbolsParam = request.nextUrl.searchParams.get('symbols') || 'RELIANCE,HDFCBANK'

  if (!scanId) {
    return NextResponse.json({
      message: 'Webhook endpoint active',
      availableScans: ALL_SCAN_IDS,
      testUrl: '/api/webhook?scan=VWAP_BREAKOUT&symbols=RELIANCE,TCS&secret=YOUR_SECRET',
    })
  }

  const symbols = parseSymbols(symbolsParam)
  const result = await processWebhook(scanId, symbols, true) // skip window check for testing

  return NextResponse.json({ success: true, scanId, symbols, ...result })
}

function parseSymbols(input: string): string[] {
  if (!input) return []
  return input
    .split(/[,\n\s]+/)
    .map(s => s.trim().toUpperCase())
    .filter(s => s.length > 0 && s.length <= 20)
}
