import { NextRequest, NextResponse } from 'next/server'
import { clearAllSignals } from '@/lib/logic'

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.WEBHOOK_SECRET
    if (secret) {
      const incoming = request.nextUrl.searchParams.get('secret')
      if (incoming !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
    const cleared = await clearAllSignals()
    return NextResponse.json({ success: true, cleared, timestamp: new Date().toISOString() })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Use POST /api/clear?secret=YOUR_SECRET to clear all signals' })
}
