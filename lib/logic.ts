import { redis, keys } from './redis'
import { TTL } from './constants'
import type { StockState, StockTier, EntryPath } from './types'

// Evaluate tier status from current flags
export function evaluateTier(state: StockState): {
  tier: StockTier
  entryPath: EntryPath
  entryConditionsMet: string[]
  missingConditions: string[]
} {
  // STEP 1 — Blocked check takes absolute priority
  if (state.I1_macd_bearish || state.I2_ema_below_vwap) {
    const reasons = []
    if (state.I1_macd_bearish) reasons.push('MACD bearish (3-min)')
    if (state.I2_ema_below_vwap) reasons.push('10 EMA below VWAP')
    return {
      tier: 'BLOCKED',
      entryPath: null,
      entryConditionsMet: reasons,
      missingConditions: [],
    }
  }

  // STEP 2 — Check Path 1 entry (VWAP Breakout)
  // Requires: I3 + I4 + I5
  const path1Met = []
  const path1Missing = []

  if (state.I3_vwap_cross) path1Met.push('Price above VWAP')
  else path1Missing.push('Price above VWAP')

  if (state.I4_macd_bullish) path1Met.push('MACD bullish (5-min)')
  else path1Missing.push('MACD bullish (5-min)')

  if (state.I5_rsi_spike) path1Met.push('RSI spike > 70 (1-min)')
  else path1Missing.push('RSI confirmation')

  if (path1Missing.length === 0) {
    return {
      tier: 'ENTRY',
      entryPath: 'PATH1',
      entryConditionsMet: path1Met,
      missingConditions: [],
    }
  }

  // STEP 3 — Check Path 2 entry (EMA Pullback)
  // Requires: I4 + I6 + (I7A or I7B) + I8
  const path2Met = []
  const path2Missing = []

  if (state.I4_macd_bullish) path2Met.push('MACD bullish (5-min)')
  else path2Missing.push('MACD bullish (5-min)')

  if (state.I6_ema_stack) path2Met.push('10 EMA above 20 EMA')
  else path2Missing.push('EMA stack (10 > 20)')

  if (state.I7A_near_10ema || state.I7B_near_20ema) {
    const ema = state.I7A_near_10ema ? '10 EMA' : '20 EMA'
    path2Met.push(`Near ${ema} (pullback)`)
  } else {
    path2Missing.push('EMA pullback touch')
  }

  if (state.I8_rsi_cool) path2Met.push('RSI cooled 45-60')
  else path2Missing.push('RSI cooldown (45-60)')

  if (path2Missing.length === 0) {
    return {
      tier: 'ENTRY',
      entryPath: 'PATH2',
      entryConditionsMet: path2Met,
      missingConditions: [],
    }
  }

  // STEP 4 — Watchlist (partial conditions met)
  const allMet = [...new Set([...path1Met, ...path2Met])]
  if (allMet.length > 0) {
    // Show the path closer to completion
    const path1Progress = path1Met.length / 3
    const path2Progress = path2Met.length / 4
    const betterPath = path1Progress >= path2Progress ? path1Missing : path2Missing

    return {
      tier: 'WATCHLIST',
      entryPath: null,
      entryConditionsMet: allMet,
      missingConditions: betterPath,
    }
  }

  return {
    tier: 'IDLE',
    entryPath: null,
    entryConditionsMet: [],
    missingConditions: [],
  }
}

// Process incoming webhook — update stock state in Redis
export async function processWebhook(scanId: string, symbols: string[]): Promise<void> {
  const now = new Date().toISOString()

  for (const rawSymbol of symbols) {
    const symbol = rawSymbol.toUpperCase().trim()
    if (!symbol) continue

    const key = keys.stock(symbol)

    // Get existing state or create fresh
    let existing = await redis.get<StockState>(key)

    const state: StockState = existing ?? {
      symbol,
      I1_macd_bearish: false,
      I2_ema_below_vwap: false,
      I3_vwap_cross: false,
      I4_macd_bullish: false,
      I5_rsi_spike: false,
      I6_ema_stack: false,
      I7A_near_10ema: false,
      I7B_near_20ema: false,
      I8_rsi_cool: false,
      tier: 'IDLE',
      entryPath: null,
      entryConditionsMet: [],
      missingConditions: [],
      firstSeen: now,
      lastUpdated: now,
      signalAge: 0,
    }

    // Apply the incoming scan signal
    switch (scanId) {
      case 'I1': state.I1_macd_bearish = true; break
      case 'I2': state.I2_ema_below_vwap = true; break
      case 'I3': state.I3_vwap_cross = true; break
      case 'I4': state.I4_macd_bullish = true; break
      case 'I5': state.I5_rsi_spike = true; break
      case 'I6': state.I6_ema_stack = true; break
      case 'I7A': state.I7A_near_10ema = true; break
      case 'I7B': state.I7B_near_20ema = true; break
      case 'I8': state.I8_rsi_cool = true; break
    }

    // Re-evaluate tier
    const evaluation = evaluateTier(state)
    state.tier = evaluation.tier
    state.entryPath = evaluation.entryPath
    state.entryConditionsMet = evaluation.entryConditionsMet
    state.missingConditions = evaluation.missingConditions
    state.lastUpdated = now

    // Calculate signal age in minutes
    const firstSeenMs = new Date(state.firstSeen).getTime()
    state.signalAge = Math.floor((Date.now() - firstSeenMs) / 60000)

    // Set TTL based on tier
    const ttl = state.tier === 'BLOCKED' ? TTL.BLOCKED_SIGNAL : TTL.BULLISH_SIGNAL

    await redis.set(key, state, { ex: ttl })
  }
}

// Fetch all current stock states from Redis
export async function getAllStocks(): Promise<StockState[]> {
  const pattern = keys.allStocks()
  const stockKeys = await redis.keys(pattern)

  if (!stockKeys || stockKeys.length === 0) return []

  const pipeline = redis.pipeline()
  for (const k of stockKeys) {
    pipeline.get(k)
  }

  const results = await pipeline.exec()
  const stocks: StockState[] = []

  for (const result of results) {
    if (result && typeof result === 'object') {
      stocks.push(result as StockState)
    }
  }

  return stocks
}

// Check if market is currently open (IST)
export function isMarketOpen(): boolean {
  const now = new Date()
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000
  const ist = new Date(now.getTime() + istOffset)

  const day = ist.getUTCDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false

  const hours = ist.getUTCHours()
  const minutes = ist.getUTCMinutes()
  const totalMinutes = hours * 60 + minutes

  const marketOpen = 9 * 60 + 15   // 9:15 AM
  const marketClose = 15 * 60 + 30 // 3:30 PM

  return totalMinutes >= marketOpen && totalMinutes <= marketClose
}
