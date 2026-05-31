export type StockTier = 'BLOCKED' | 'WATCHLIST' | 'ENTRY' | 'IDLE'
export type EntryPath = 'PATH1' | 'PATH2' | null

export interface StockState {
  symbol: string

  // Blocked flags
  I1_macd_bearish: boolean   // MACD below histogram 3-min
  I2_ema_below_vwap: boolean // 10 EMA below VWAP

  // Path 1 watchlist flags
  I3_vwap_cross: boolean     // Price above VWAP
  I4_macd_bullish: boolean   // MACD above histogram 5-min
  I5_rsi_spike: boolean      // RSI > 70 on 1-min

  // Path 2 watchlist flags
  I6_ema_stack: boolean      // 10 EMA above 20 EMA
  I7A_near_10ema: boolean    // Price near 10 EMA
  I7B_near_20ema: boolean    // Price near 20 EMA
  I8_rsi_cool: boolean       // RSI 45-60

  // Computed status
  tier: StockTier
  entryPath: EntryPath
  entryConditionsMet: string[]  // Human readable list of met conditions
  missingConditions: string[]   // What is still needed

  // Timing
  firstSeen: string   // ISO timestamp
  lastUpdated: string // ISO timestamp
  signalAge: number   // Minutes since first entry signal
}

export interface DashboardData {
  entrySignals: StockState[]
  watchlist: StockState[]
  blocked: StockState[]
  lastRefresh: string
  marketOpen: boolean
  totalSignals: number
}
