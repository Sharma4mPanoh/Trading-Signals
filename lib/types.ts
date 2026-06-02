export interface Signal {
  symbol: string
  scanId: string
  module: 'INTRADAY' | 'DELIVERY'
  receivedAt: string        // ISO string
  signalAgeMinutes: number
  description: string
  // Manual price fields — set by user on the card
  entryPrice?: number | null
  stopLoss?: number | null
  targetPrice?: number | null
  // Trade regime derived from scanId
  trailMethod: 'EMA_9' | 'EMA_20'
}

export interface TradingWindow {
  start: string   // "09:30"
  end: string     // "11:00"
  enabled: boolean
  label: string
}

export interface SignalsResponse {
  intraday: Signal[]
  delivery: Signal[]
  marketOpen: boolean
  inActiveWindow: boolean
  lastRefreshed: string
  windows: TradingWindow[]
}

export interface ArchivedSignal extends Signal {
  archivedAt: string   // ISO string — when it was archived
  outcome?: 'target_hit' | 'sl_hit' | 'expired' | null
}

export type SessionRegime = 'POWER_HOUR' | 'GRAVEYARD' | 'SECOND_WIND' | 'CLOSED'

export interface SessionInfo {
  regime: SessionRegime
  label: string
  timeRange: string
  instruction: string
  color: string
}
