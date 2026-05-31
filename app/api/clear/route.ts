import { NextRequest, NextResponse } from 'next/server'
import { redis, keys } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    // Require webhook secret for security
    const secret = process.env.WEBHOOK_SECRET
    if (secret) {
      const incoming = request.nextUrl.searchParams.get('secret')
      if (incoming !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Find and delete all stock keys
    const stockKeys = await redis.keys(keys.allStocks())

    if (stockKeys.length === 0) {
      return NextResponse.json({ message: 'Nothing to clear', cleared: 0 })
    }

    const pipeline = redis.pipeline()
    for (const key of stockKeys) {
      pipeline.del(key)
    }
    await pipeline.exec()

    return NextResponse.json({
      success: true,
      message: `Cleared ${stockKeys.length} stocks`,
      cleared: stockKeys.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Clear error:', error)
    return NextResponse.json(
      { error: 'Failed to clear signals', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to clear all signals',
    endpoint: 'POST /api/clear?secret=your_secret',
  })
}
