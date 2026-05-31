import { NextRequest, NextResponse } from 'next/server'
import { processWebhook } from '@/lib/logic'
import { SCANS } from '@/lib/constants'

// Chartink sends POST with form data or JSON
// Payload typically: { stocks: "RELIANCE,HDFCBANK,TCS" } or similar

export async function POST(request: NextRequest) {
  try {
    // Validate webhook secret if configured
    const secret = process.env.WEBHOOK_SECRET
    if (secret) {
      const incoming = request.nextUrl.searchParams.get('secret')
      if (incoming !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Get scan ID from query param
    const scanId = request.nextUrl.searchParams.get('scan')?.toUpperCase()

    if (!scanId || !Object.keys(SCANS).includes(scanId)) {
      return NextResponse.json(
        { error: `Invalid scan ID: ${scanId}. Must be one of: ${Object.keys(SCANS).join(', ')}` },
        { status: 400 }
      )
    }

    // Parse the request body — Chartink sends form-encoded data
    let symbols: string[] = []

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      // Handle various Chartink payload formats
      const stockStr = body.stocks || body.symbols || body.data || ''
      symbols = parseSymbols(stockStr)
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      const stockStr = formData.get('stocks')?.toString() ||
                       formData.get('symbols')?.toString() || ''
      symbols = parseSymbols(stockStr)
    } else {
      // Try to parse as text
      const text = await request.text()
      symbols = parseSymbols(text)
    }

    if (symbols.length === 0) {
      return NextResponse.json(
        { message: 'No symbols found in payload', scanId },
        { status: 200 }
      )
    }

    // Process the webhook — update Redis state
    await processWebhook(scanId, symbols)

    return NextResponse.json({
      success: true,
      scanId,
      symbolsProcessed: symbols.length,
      symbols,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

// Also handle GET for manual testing
export async function GET(request: NextRequest) {
  const scanId = request.nextUrl.searchParams.get('scan')
  const symbolsParam = request.nextUrl.searchParams.get('symbols') || 'RELIANCE,HDFCBANK'

  if (!scanId) {
    return NextResponse.json({
      message: 'Webhook endpoint active',
      usage: 'POST /api/webhook?scan=I1 with body: { stocks: "SYMBOL1,SYMBOL2" }',
      availableScans: Object.keys(SCANS),
      testUrl: '/api/webhook?scan=I3&symbols=RELIANCE,TCS (GET for testing)',
    })
  }

  // Allow GET-based testing
  const symbols = parseSymbols(symbolsParam)
  await processWebhook(scanId.toUpperCase(), symbols)

  return NextResponse.json({
    success: true,
    message: 'Test webhook processed',
    scanId: scanId.toUpperCase(),
    symbols,
  })
}

function parseSymbols(input: string): string[] {
  if (!input) return []
  // Handle comma, newline, or space separated symbols
  return input
    .split(/[,\n\s]+/)
    .map(s => s.trim().toUpperCase())
    .filter(s => s.length > 0 && s.length <= 20) // Basic sanity check
}
