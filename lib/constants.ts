// Scan identifiers — maps to your 9 Chartink scans
export const SCANS = {
  // BLOCKED tier
  I1: 'I1', // MACD crossed below histogram (3-min)
  I2: 'I2', // 10 EMA crossed below VWAP (3-min)

  // WATCHLIST tier — Path 1 (VWAP Breakout)
  I3: 'I3', // Price crossed above VWAP (3-min)

  // WATCHLIST tier — Both paths
  I4: 'I4', // MACD crossed above histogram (5-min)

  // ENTRY TRIGGER — Path 1
  I5: 'I5', // RSI crossed above 70 (1-min)

  // WATCHLIST tier — Path 2 (EMA Pullback)
  I6: 'I6',  // 10 EMA above 20 EMA (5-min)
  I7A: 'I7A', // Price within 0.5% of 10 EMA (3-min)
  I7B: 'I7B', // Price within 0.5% of 20 EMA (3-min)

  // ENTRY TRIGGER — Path 2
  I8: 'I8',  // RSI between 45 and 60 (3-min)
} as const

export type ScanId = keyof typeof SCANS

// TTL values in seconds
export const TTL = {
  BULLISH_SIGNAL: 900,  // 15 minutes
  BLOCKED_SIGNAL: 1800, // 30 minutes
  RSI_SPIKE: 900,       // 15 minutes — Path 1 RSI > 70 window
} as const

// Market hours (IST) — polling stops outside these
export const MARKET = {
  OPEN_HOUR: 9,
  OPEN_MINUTE: 15,
  CLOSE_HOUR: 15,
  CLOSE_MINUTE: 30,
} as const

// Polling intervals in milliseconds
export const POLLING = {
  IDLE: 30000,   // 30 seconds — no active entry signals
  ACTIVE: 10000, // 10 seconds — entry signals present
  CLOSED: 60000, // 60 seconds — outside market hours
} as const

// Scan descriptions for display
export const SCAN_LABELS: Record<ScanId, string> = {
  I1: 'MACD below Histogram (3-min)',
  I2: '10 EMA below VWAP (3-min)',
  I3: 'Price above VWAP (3-min)',
  I4: 'MACD above Histogram (5-min)',
  I5: 'RSI crossed above 70 (1-min)',
  I6: '10 EMA above 20 EMA (5-min)',
  I7A: 'Price near 10 EMA (3-min)',
  I7B: 'Price near 20 EMA (3-min)',
  I8: 'RSI between 45-60 (3-min)',
}
