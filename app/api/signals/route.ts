import { NextResponse } from 'next/server'
import { getAllStocks, isMarketOpen } from '@/lib/logic'
import type { DashboardData } from '@/lib/types'

export async function GET() {
  try {
    const stocks = await getAllStocks()
    const marketOpen = isMarketOpen()

    // Separate into tiers
    const entrySignals = stocks
      .filter(s => s.tier === 'ENTRY')
      .sort((a, b) => a.signalAge - b.signalAge) // Newest first

    const watchlist = stocks
      .filter(s => s.tier === 'WATCHLIST')
      .sort((a, b) => b.entryConditionsMet.length - a.entryConditionsMet.length) // Most conditions met first

    const blocked = stocks
      .filter(s => s.tier === 'BLOCKED')
      .sort((a, b) => a.symbol.localeCompare(b.symbol))

    const dashboardData: DashboardData = {
      entrySignals,
      watchlist,
      blocked,
      lastRefresh: new Date().toISOString(),
      marketOpen,
      totalSignals: entrySignals.length,
    }

    return NextResponse.json(dashboardData, {
      headers: {
        // Prevent caching — always serve fresh data
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Signals API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch signals', details: String(error) },
      { status: 500 }
    )
  }
}
