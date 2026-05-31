import { redis, KEYS } from './redis'
import { TTL, INTRADAY_SCANS, DELIVERY_SCANS, SCAN_DESCRIPTIONS, DEFAULT_WINDOWS } from './constants'
import type { Signal, SignalModule, SignalPath, TradingWindows, DashboardData } from './types'

// ─── IST Time Utilities ───────────────────────────────────────────────────────

export function getISTTime(): Date {
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  return new Date(now.getTime() + istOffset)
}

export function formatISTTime(date: Date): string {
  return date.toISOString().slice(11, 16) // HH:MM
}

export function isMarketOpen(): boolean {
  const ist = getISTTime()
  const day = ist.getUTCDay()
  if (day === 0 || day === 6) return false
  const hhmm = formatISTTime(ist)
  return hhmm >= '09:15' && hhmm <= '15:30'
}

export function isInTradingWindow(windows: TradingWindows): boolean {
  const ist = getISTTime()
  const day = ist.getUTCDay()
  if (day === 0 || day === 6) return false

  const hhmm = formatISTTime(ist)

  const inMorning = windows.morning.enabled &&
    hhmm >= windows.morning.start &&
    hhmm <= windows.morning.end

  const inAfternoon = windows.afternoon.enabled &&
    hhmm >= windows.afternoon.start &&
    hhmm <= windows.afternoon.end

  return inMorning || inAfternoon
}

// ─── Window Config ────────────────────────────────────────────────────────────

export async function getWindows(): Promise<TradingWindows> {
  try {
    const saved = await redis.get<TradingWindows>(KEYS.windows())
    return saved ?? DEFAULT_WINDOWS
  } catch {
    return DEFAULT_WINDOWS
  }
}

export async function saveWindows(windows: TradingWindows): Promise<void> {
  await redis.set(KEYS.windows(), windows)
}

// ─── Signal Processing ────────────────────────────────────────────────────────

export function getScanModule(scanId: string): SignalModule {
  if (Object.keys(INTRADAY_SCANS).includes(scanId)) return 'INTRADAY'
  if (Object.keys(DELIVERY_SCANS).includes(scanId)) return 'DELIVERY'
  throw new Error(`Unknown scan ID: ${scanId}`)
}

export async function processWebhook(
  scanId: string,
  symbols: string[],
  skipWindowCheck = false
): Promise<{ processed: number; skipped: number; reason?: string }> {

  const module = getScanModule(scanId)
  const windows = await getWindows()

  // For intraday scans — check trading window
  if (module === 'INTRADAY' && !skipWindowCheck) {
    if (!isInTradingWindow(windows)) {
      return { processed: 0, skipped: symbols.length, reason: 'Outside trading window' }
    }
  }

  const now = new Date()
  const ttl = module === 'INTRADAY' ? TTL.INTRADAY_SIGNAL : TTL.DELIVERY_SIGNAL
  const expiresAt = new Date(now.getTime() + ttl * 1000).toISOString()

  let processed = 0

  for (const rawSymbol of symbols) {
    const symbol = rawSymbol.toUpperCase().trim()
    if (!symbol || symbol.length > 20) continue

    const signal: Signal = {
      symbol,
      scanId: scanId as SignalPath,
      module,
      description: SCAN_DESCRIPTIONS[scanId] ?? scanId,
      receivedAt: now.toISOString(),
      expiresAt,
      signalAgeMinutes: 0,
    }

    await redis.set(KEYS.signal(symbol, scanId), signal, { ex: ttl })
    processed++
  }

  return { processed, skipped: 0 }
}

// ─── Dashboard Data ───────────────────────────────────────────────────────────

export async function getDashboardData(): Promise<DashboardData> {
  const [allKeys, windows] = await Promise.all([
    redis.keys(KEYS.allSignals()),
    getWindows(),
  ])

  const intraday: Signal[] = []
  const delivery: Signal[] = []

  if (allKeys && allKeys.length > 0) {
    const pipeline = redis.pipeline()
    for (const k of allKeys) pipeline.get(k)
    const results = await pipeline.exec()

    const now = Date.now()

    for (const result of results) {
      if (!result || typeof result !== 'object') continue
      const signal = result as Signal

      // Calculate live age
      signal.signalAgeMinutes = Math.floor(
        (now - new Date(signal.receivedAt).getTime()) / 60000
      )

      if (signal.module === 'INTRADAY') intraday.push(signal)
      else delivery.push(signal)
    }
  }

  // Sort — newest first
  const byAge = (a: Signal, b: Signal) => a.signalAgeMinutes - b.signalAgeMinutes
  intraday.sort(byAge)
  delivery.sort(byAge)

  const ist = getISTTime()

  return {
    intraday,
    delivery,
    windows,
    marketOpen: isMarketOpen(),
    inActiveWindow: isInTradingWindow(windows),
    currentTimeIST: ist.toISOString().slice(11, 19),
    lastRefresh: new Date().toISOString(),
  }
}

// ─── Clear All Signals ────────────────────────────────────────────────────────

export async function clearAllSignals(): Promise<number> {
  const keys = await redis.keys(KEYS.allSignals())
  if (!keys || keys.length === 0) return 0

  const pipeline = redis.pipeline()
  for (const k of keys) pipeline.del(k)
  await pipeline.exec()

  return keys.length
}
