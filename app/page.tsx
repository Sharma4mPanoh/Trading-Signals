'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { DashboardData, StockState } from '@/lib/types'
import { POLLING } from '@/lib/constants'

// ─── Utility ────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  })
}

function formatAge(minutes: number): string {
  if (minutes < 1) return 'just now'
  if (minutes === 1) return '1 min ago'
  return `${minutes} mins ago`
}

function getPathLabel(path: string | null): string {
  if (path === 'PATH1') return 'VWAP Breakout'
  if (path === 'PATH2') return 'EMA Pullback'
  return ''
}

function getPathColor(path: string | null): string {
  if (path === 'PATH1') return '#4d9fff'
  if (path === 'PATH2') return '#a78bfa'
  return '#7a9cc0'
}

// ─── Components ─────────────────────────────────────────────────────────────

function LiveDot({ color }: { color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: color,
      animation: 'pulse 2s ease-in-out infinite',
      flexShrink: 0,
    }} />
  )
}

function EntryCard({ stock }: { stock: StockState }) {
  const pathColor = getPathColor(stock.entryPath)
  const pathLabel = getPathLabel(stock.entryPath)

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--green-dim)',
      borderLeft: '3px solid var(--green)',
      borderRadius: 8,
      padding: '14px 16px',
      animation: 'fadeIn 0.3s ease forwards',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Green glow background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--green-glow)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LiveDot color="var(--green)" />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '0.05em',
            }}>
              {stock.symbol}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              color: pathColor,
              background: `${pathColor}18`,
              border: `1px solid ${pathColor}40`,
              borderRadius: 4,
              padding: '2px 8px',
              fontFamily: 'var(--font-mono)',
            }}>
              {pathLabel}
            </span>
          </div>
          <span style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            {formatAge(stock.signalAge)}
          </span>
        </div>

        {/* Conditions met */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {stock.entryConditionsMet.map((condition, i) => (
            <span key={i} style={{
              fontSize: 11,
              color: 'var(--green)',
              background: 'var(--green-dim)',
              borderRadius: 4,
              padding: '3px 8px',
              fontFamily: 'var(--font-mono)',
            }}>
              ✓ {condition}
            </span>
          ))}
        </div>

        {/* Last updated */}
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Updated: {formatTime(stock.lastUpdated)}
        </div>
      </div>
    </div>
  )
}

function WatchlistCard({ stock }: { stock: StockState }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--yellow-dim)',
      borderLeft: '3px solid var(--yellow)',
      borderRadius: 8,
      padding: '12px 16px',
      animation: 'fadeIn 0.3s ease forwards',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            {stock.symbol}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {stock.entryConditionsMet.length} condition{stock.entryConditionsMet.length !== 1 ? 's' : ''} met
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {formatTime(stock.lastUpdated)}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
        {stock.entryConditionsMet.map((c, i) => (
          <span key={i} style={{
            fontSize: 11,
            color: 'var(--yellow)',
            background: 'var(--yellow-dim)',
            borderRadius: 4,
            padding: '2px 7px',
            fontFamily: 'var(--font-mono)',
          }}>✓ {c}</span>
        ))}
      </div>

      {stock.missingConditions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {stock.missingConditions.map((c, i) => (
            <span key={i} style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '2px 7px',
              fontFamily: 'var(--font-mono)',
            }}>
              ○ {c}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function BlockedRow({ stocks }: { stocks: StockState[] }) {
  const [expanded, setExpanded] = useState(false)

  if (stocks.length === 0) return null

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--red-dim)',
      borderLeft: '3px solid var(--red)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--red)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
          🔴 BLOCKED ({stocks.length})
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {expanded ? '▲ hide' : '▼ show'}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {stocks.map(s => (
            <span key={s.symbol} style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--red)',
              background: 'var(--red-dim)',
              borderRadius: 4,
              padding: '3px 8px',
            }}>
              {s.symbol}
              <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
                {s.entryConditionsMet.join(', ')}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ marketOpen }: { marketOpen: boolean }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      color: 'var(--text-muted)',
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>
        {marketOpen ? '⌛' : '🌙'}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, marginBottom: 6 }}>
        {marketOpen ? 'Waiting for signals' : 'Market closed'}
      </div>
      <div style={{ fontSize: 12 }}>
        {marketOpen
          ? 'Chartink scans will push signals here when conditions are met'
          : 'Market opens at 09:15 IST on weekdays'}
      </div>
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastPoll, setLastPoll] = useState<Date | null>(null)
  const [pollInterval, setPollInterval] = useState(POLLING.IDLE)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/signals', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: DashboardData = await res.json()
      setData(json)
      setError(null)
      setLastPoll(new Date())

      // Smart polling — adjust interval based on active signals and market state
      if (!json.marketOpen) {
        setPollInterval(POLLING.CLOSED)
      } else if (json.entrySignals.length > 0) {
        setPollInterval(POLLING.ACTIVE)  // 10 seconds when signals present
      } else {
        setPollInterval(POLLING.IDLE)    // 30 seconds when quiet
      }
    } catch (err) {
      setError('Unable to reach server. Retrying...')
    }
  }, [])

  // Smart polling loop
  useEffect(() => {
    fetchSignals()

    const schedule = () => {
      timeoutRef.current = setTimeout(() => {
        fetchSignals().then(schedule)
      }, pollInterval)
    }

    schedule()

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [fetchSignals, pollInterval])

  const hasAnyData = data && (
    data.entrySignals.length > 0 ||
    data.watchlist.length > 0 ||
    data.blocked.length > 0
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      padding: '0',
    }}>
      {/* Header */}
      <header style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LiveDot color={data?.marketOpen ? 'var(--green)' : 'var(--text-muted)'} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '0.08em',
          }}>
            INTRADAY SIGNALS
          </span>
          <span style={{
            fontSize: 11,
            color: data?.marketOpen ? 'var(--green)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            {data?.marketOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {data && (
            <span style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              {data.entrySignals.length > 0
                ? `Polling every ${POLLING.ACTIVE / 1000}s`
                : `Polling every ${data.marketOpen ? POLLING.IDLE / 1000 : POLLING.CLOSED / 1000}s`
              }
            </span>
          )}
          {lastPoll && (
            <span style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              {formatTime(lastPoll.toISOString())}
            </span>
          )}
          {error && (
            <span style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
              ⚠ {error}
            </span>
          )}
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>

        {!data ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Loading...
          </div>
        ) : !hasAnyData ? (
          <EmptyState marketOpen={data.marketOpen} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Entry Signals */}
            <section>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--green)',
                  letterSpacing: '0.1em',
                }}>
                  🟢 ENTRY SIGNALS
                </span>
                {data.entrySignals.length > 0 && (
                  <span style={{
                    fontSize: 11,
                    color: 'var(--green)',
                    background: 'var(--green-dim)',
                    borderRadius: 10,
                    padding: '1px 8px',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {data.entrySignals.length}
                  </span>
                )}
              </div>

              {data.entrySignals.length === 0 ? (
                <div style={{
                  padding: '20px 16px',
                  background: 'var(--bg-card)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                }}>
                  No entry signals yet — watching for confluence
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.entrySignals.map(stock => (
                    <EntryCard key={stock.symbol} stock={stock} />
                  ))}
                </div>
              )}
            </section>

            {/* Watchlist */}
            {data.watchlist.length > 0 && (
              <section>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 12,
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--yellow)',
                    letterSpacing: '0.1em',
                  }}>
                    🟡 WATCHLIST
                  </span>
                  <span style={{
                    fontSize: 11,
                    color: 'var(--yellow)',
                    background: 'var(--yellow-dim)',
                    borderRadius: 10,
                    padding: '1px 8px',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {data.watchlist.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.watchlist.map(stock => (
                    <WatchlistCard key={stock.symbol} stock={stock} />
                  ))}
                </div>
              </section>
            )}

            {/* Blocked — collapsed by default */}
            {data.blocked.length > 0 && (
              <section>
                <BlockedRow stocks={data.blocked} />
              </section>
            )}

          </div>
        )}
      </main>

      {/* Footer — webhook URLs reference */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '16px 20px',
        marginTop: 40,
        maxWidth: 900,
        margin: '40px auto 0',
      }}>
        <details>
          <summary style={{
            cursor: 'pointer',
            fontSize: 11,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            userSelect: 'none',
          }}>
            ▶ Chartink Webhook URLs
          </summary>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              ['I1', 'MACD below histogram (3-min) — BLOCKED'],
              ['I2', '10 EMA below VWAP (3-min) — BLOCKED'],
              ['I3', 'Price above VWAP (3-min) — Watchlist'],
              ['I4', 'MACD above histogram (5-min) — Watchlist'],
              ['I5', 'RSI above 70 (1-min) — Entry Trigger'],
              ['I6', '10 EMA above 20 EMA (5-min) — Watchlist'],
              ['I7A', 'Price near 10 EMA (3-min) — Pullback'],
              ['I7B', 'Price near 20 EMA (3-min) — Pullback'],
              ['I8', 'RSI 45-60 (3-min) — Entry Trigger'],
            ].map(([id, label]) => (
              <div key={id} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                <code style={{
                  fontSize: 11,
                  color: 'var(--blue)',
                  fontFamily: 'var(--font-mono)',
                  minWidth: 320,
                  wordBreak: 'break-all',
                }}>
                  /api/webhook?scan={id}
                </code>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </details>
      </footer>
    </div>
  )
}
