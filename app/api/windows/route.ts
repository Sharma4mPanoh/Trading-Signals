import { NextRequest, NextResponse } from 'next/server'
import { saveWindows, getWindows } from '@/lib/logic'
import type { TradingWindows } from '@/lib/types'

export async function GET() {
  try {
    const windows = await getWindows()
    return NextResponse.json(windows)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: TradingWindows = await request.json()

    // Basic validation
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

    if (!timeRegex.test(body.morning?.start) ||
        !timeRegex.test(body.morning?.end) ||
        !timeRegex.test(body.afternoon?.start) ||
        !timeRegex.test(body.afternoon?.end)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:MM (e.g. 09:30)' },
        { status: 400 }
      )
    }

    await saveWindows(body)
    return NextResponse.json({ success: true, windows: body })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
