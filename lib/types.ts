export type SignalModule = 'INTRADAY' | 'DELIVERY'
export type SignalPath = 'VWAP_BREAKOUT' | 'EMA_PULLBACK' | 'MOMENTUM_BREAKOUT' | 'TREND_PULLBACK'

export interface Signal {
  symbol: string
  scanId: SignalPath
  module: SignalModule
  description: string
  receivedAt: string   // ISO timestamp
  expiresAt: string    // ISO timestamp
  signalAgeMinutes: number
}

export interface TradingWindow {
  start: string   // HH:MM in IST
  end: string     // HH:MM in IST
  enabled: boolean
}

export interface TradingWindows {
  morning: TradingWindow
  afternoon: TradingWindow
}

export interface DashboardData {
  intraday: Signal[]
  delivery: Signal[]
  windows: TradingWindows
  marketOpen: boolean
  inActiveWindow: boolean
  currentTimeIST: string
  lastRefresh: string
}
