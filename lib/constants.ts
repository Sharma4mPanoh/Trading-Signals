// ─── Scan IDs ────────────────────────────────────────────────────────────────

export const INTRADAY_SCANS = {
  VWAP_BREAKOUT: 'VWAP_BREAKOUT', // RSI > 70 + Price above VWAP + MACD bullish
  EMA_PULLBACK:  'EMA_PULLBACK',  // 10/20 EMA touch + MACD + RSI 45-65
} as const

export const DELIVERY_SCANS = {
  MOMENTUM_BREAKOUT: 'MOMENTUM_BREAKOUT', // Price > 20 EMA + MACD cross + RSI 55-68
  TREND_PULLBACK:    'TREND_PULLBACK',    // Price near 20 EMA + EMAs stacked + RSI 45-60
} as const

export const ALL_SCAN_IDS = [
  ...Object.values(INTRADAY_SCANS),
  ...Object.values(DELIVERY_SCANS),
]

export type IntradayScanId = keyof typeof INTRADAY_SCANS
export type DeliveryScanId = keyof typeof DELIVERY_SCANS
export type ScanId = IntradayScanId | DeliveryScanId

// ─── TTL Values (seconds) ────────────────────────────────────────────────────

export const TTL = {
  INTRADAY_SIGNAL: 75 * 60,   // 75 minutes — outlasts 60-min webhook cycle
  DELIVERY_SIGNAL: 28 * 3600, // 28 hours — persists through next trading day
} as const

// ─── Polling Intervals (milliseconds) ────────────────────────────────────────

export const POLLING = {
  ACTIVE:  10000, // 10 seconds — entry signals present
  IDLE:    30000, // 30 seconds — no active signals
  CLOSED:  60000, // 60 seconds — market closed
} as const

// ─── Scan Labels ─────────────────────────────────────────────────────────────

export const SCAN_LABELS: Record<string, string> = {
  VWAP_BREAKOUT:     'VWAP Breakout',
  EMA_PULLBACK:      'EMA Pullback',
  MOMENTUM_BREAKOUT: 'Momentum Breakout',
  TREND_PULLBACK:    'Trend Pullback',
}

// ─── Scan Descriptions ───────────────────────────────────────────────────────

export const SCAN_DESCRIPTIONS: Record<string, string> = {
  VWAP_BREAKOUT:     'RSI > 70 (1-min) · Price above VWAP (3-min) · MACD bullish (5-min)',
  EMA_PULLBACK:      'Near 10/20 EMA (5-min) · MACD bullish (5-min) · RSI 45-65 (5-min)',
  MOMENTUM_BREAKOUT: 'Price > 20 EMA · MACD cross · RSI 55-68 · Volume confirmed',
  TREND_PULLBACK:    'EMAs stacked · Price near 20 EMA · RSI 45-60 · MACD > 0',
}

// ─── Default Trading Windows (IST) ───────────────────────────────────────────

export const DEFAULT_WINDOWS = {
  morning: { start: '09:30', end: '11:00', enabled: true },
  afternoon: { start: '13:00', end: '14:45', enabled: true },
} as const
