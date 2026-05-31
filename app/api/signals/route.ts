import { NextResponse } from 'next/server'
import { getDashboardData } from '@/lib/logic'

export async function GET() {
  try {
    const data = await getDashboardData()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  } catch (error) {
    console.error('Signals API error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
