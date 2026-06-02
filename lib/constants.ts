export const INTRADAY_SCANS: Record<string, string> = {
  VWAP_BREAKOUT: 'VWAP_BREAKOUT',
  EMA_PULLBACK:  'EMA_PULLBACK',
}

export const DELIVERY_SCANS: Record<string, string> = {
  MOMENTUM_BREAKOUT: 'MOMENTUM_BREAKOUT',
  TREND_PULLBACK:    'TREND_PULLBACK',
}

export const ALL_SCAN_IDS = [
  ...Object.values(INTRADAY_SCANS),
  ...Object.values(DELIVERY_SCANS),
]

export const SCAN_LABELS: Record<string, string> = {
  VWAP_BREAKOUT:     'VWAP Breakout',
  EMA_PULLBACK:      'EMA Pullback',
  MOMENTUM_BREAKOUT: 'Momentum Breakout',
  TREND_PULLBACK:    'Trend Pullback',
}

export const SCAN_DESCRIPTIONS: Record<string, string> = {
  VWAP_BREAKOUT:     'RSI > 70 · Price above VWAP · MACD bullish crossover',
  EMA_PULLBACK:      '10/20 EMA touch · MACD signal · RSI 45–65 range',
  MOMENTUM_BREAKOUT: 'Price > 20 EMA · MACD cross · RSI 55–68 zone',
  TREND_PULLBACK:    'Price near 20 EMA · EMAs stacked · RSI 45–60 zone',
}

// Trail method by scan type — per the trading framework
// VWAP breakout → trail 9 EMA close
// EMA pullback  → trail 20 EMA close
export const SCAN_TRAIL_METHOD: Record<string, 'EMA_9' | 'EMA_20'> = {
  VWAP_BREAKOUT:     'EMA_9',
  EMA_PULLBACK:      'EMA_20',
  MOMENTUM_BREAKOUT: 'EMA_20',
  TREND_PULLBACK:    'EMA_20',
}

export const SCAN_COLORS: Record<string, string> = {
  VWAP_BREAKOUT:     '#3d8ef0',
  EMA_PULLBACK:      '#a78bfa',
  MOMENTUM_BREAKOUT: '#00cc88',
  TREND_PULLBACK:    '#f0b429',
}

// TTL in seconds
export const INTRADAY_TTL = 75 * 60   // 75 minutes
export const DELIVERY_TTL = 28 * 3600 // 28 hours

// Polling intervals in ms
export const POLL_ACTIVE  = 10_000
export const POLL_IDLE    = 30_000
export const POLL_CLOSED  = 60_000

// Session regime windows (IST, 24h)
export const SESSION_WINDOWS = {
  POWER_HOUR:  { start: '09:15', end: '11:00' },
  GRAVEYARD:   { start: '11:00', end: '13:00' },
  SECOND_WIND: { start: '13:00', end: '14:45' },
}

export const DEFAULT_TRADING_WINDOWS = [
  { start: '09:30', end: '11:00', enabled: true,  label: 'Morning session' },
  { start: '13:00', end: '14:45', enabled: true,  label: 'Afternoon session' },
]

// Max archived signals to keep
export const ARCHIVE_MAX = 500
