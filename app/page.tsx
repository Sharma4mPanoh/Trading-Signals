'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { DashboardData, Signal, TradingWindows } from '@/lib/types'
import { POLLING } from '@/lib/constants'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAge(mins: number): string {
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 min ago'
  if (mins < 60) return `${mins} mins ago`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata',
  })
}

const PATH_COLORS: Record<string, string> = {
  VWAP_BREAKOUT:     '#3d8ef0',
  EMA_PULLBACK:      '#a78bfa',
  MOMENTUM_BREAKOUT: '#00cc88',
  TREND_PULLBACK:    '#f0b429',
}

const PATH_LABELS: Record<string, string> = {
  VWAP_BREAKOUT:     'VWAP Breakout',
  EMA_PULLBACK:      'EMA Pullback',
  MOMENTUM_BREAKOUT: 'Momentum Breakout',
  TREND_PULLBACK:    'Trend Pullback',
}

// ─── Signal Card ─────────────────────────────────────────────────────────────

function SignalCard({ signal }: { signal: Signal }) {
  const color = PATH_COLORS[signal.scanId] ?? '#3d8ef0'
  const label = PATH_LABELS[signal.scanId] ?? signal.scanId
  const isDelivery = signal.module === 'DELIVERY'

  return (
    <div className="fade-up" style={{
      background: 'var(--bg-card)',
      border: `1px solid ${color}30`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 8,
      padding: '14px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `${color}08`,
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative' }}>

        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Live dot */}
            <span className="pulse" style={{
              display: 'inline-block', width: 7, height: 7,
              borderRadius: '50%', background: color, flexShrink: 0,
            }} />
            {/* Symbol */}
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600,
              color: 'var(--text)', letterSpacing: '0.04em',
            }}>
              {signal.symbol}
            </span>
            {/* Path badge */}
            <span style={{
              fontSize: 11, fontWeight: 500, color: color,
              background: `${color}18`,
              border: `1px solid ${color}35`,
              borderRadius: 4, padding: '2px 8px',
              fontFamily: 'var(--mono)',
            }}>
              {label}
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
            {fmtAge(signal.signalAgeMinutes)}
          </span>
        </div>

        {/* Description */}
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
          {signal.description}
        </div>

        {/* Footer */}
        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
          Received: {fmtTime(signal.receivedAt)}
          {isDelivery && (
            <span style={{ marginLeft: 12, color: 'var(--yellow)', fontSize: 11 }}>
              Daily chart
            </span>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ tab, marketOpen, inWindow }: {
  tab: 'intraday' | 'delivery'
  marketOpen: boolean
  inWindow: boolean
}) {
  if (tab === 'delivery') {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>📊</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 13, marginBottom: 6 }}>No delivery signals</div>
        <div style={{ fontSize: 12 }}>Run your daily Chartink scans after market close</div>
      </div>
    )
  }

  if (!marketOpen) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🌙</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 13, marginBottom: 6 }}>Market closed</div>
        <div style={{ fontSize: 12 }}>Opens at 09:15 IST on weekdays</div>
      </div>
    )
  }

  if (!inWindow) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 13, marginBottom: 6 }}>Outside trading window</div>
        <div style={{ fontSize: 12 }}>Webhooks will be processed during your active windows</div>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>👁</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, marginBottom: 6 }}>Watching for signals</div>
      <div style={{ fontSize: 12 }}>Next Chartink webhook will update this list</div>
    </div>
  )
}

// ─── Windows Editor ───────────────────────────────────────────────────────────

function WindowsEditor({ windows, onSave }: {
  windows: TradingWindows
  onSave: (w: TradingWindows) => void
}) {
  const [local, setLocal] = useState<TradingWindows>(windows)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setLocal(windows) }, [windows])

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/windows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(local),
      })
      onSave(local)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const row = (
    label: string,
    session: 'morning' | 'afternoon'
  ) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Toggle */}
      <button
        onClick={() => setLocal(p => ({
          ...p,
          [session]: { ...p[session], enabled: !p[session].enabled }
        }))}
        style={{
          width: 36, height: 20, borderRadius: 10,
          background: local[session].enabled ? 'var(--green)' : 'var(--border-lit)',
          border: 'none', position: 'relative', flexShrink: 0,
          transition: 'background 0.2s',
        }}
      >
        <span style={{
          position: 'absolute', top: 2,
          left: local[session].enabled ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%',
          background: 'white', transition: 'left 0.2s',
        }} />
      </button>

      <span style={{ fontSize: 13, color: 'var(--text-2)', width: 80 }}>{label}</span>

      <input
        type="time"
        value={local[session].start}
        onChange={e => setLocal(p => ({ ...p, [session]: { ...p[session], start: e.target.value } }))}
        disabled={!local[session].enabled}
        style={{ opacity: local[session].enabled ? 1 : 0.4 }}
      />
      <span style={{ color: 'var(--text-3)', fontSize: 12 }}>to</span>
      <input
        type="time"
        value={local[session].end}
        onChange={e => setLocal(p => ({ ...p, [session]: { ...p[session], end: e.target.value } }))}
        disabled={!local[session].enabled}
        style={{ opacity: local[session].enabled ? 1 : 0.4 }}
      />
    </div>
  )

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '14px 16px',
      marginTop: 24,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-2)',
        letterSpacing: '0.1em', marginBottom: 12,
        fontFamily: 'var(--mono)',
      }}>
        ⚙ TRADING WINDOWS (IST)
      </div>

      {row('Morning', 'morning')}
      {row('Afternoon', 'afternoon')}

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: 'var(--blue)', color: 'white',
            border: 'none', borderRadius: 6,
            padding: '7px 18px', fontSize: 13, fontWeight: 500,
          }}
        >
          {saving ? 'Saving...' : 'Save Windows'}
        </button>
        {saved && (
          <span style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'var(--mono)' }}>
            ✓ Saved
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Webhook URLs Reference ───────────────────────────────────────────────────

function WebhookRef() {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'

  const urls = [
    { scan: 'VWAP_BREAKOUT',     label: 'Intraday — VWAP Breakout + RSI spike' },
    { scan: 'EMA_PULLBACK',      label: 'Intraday — EMA Pullback (10/20 EMA touch)' },
    { scan: 'MOMENTUM_BREAKOUT', label: 'Delivery — Daily Momentum Breakout' },
    { scan: 'TREND_PULLBACK',    label: 'Delivery — Daily Trend Continuation Pullback' },
  ]

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '14px 16px',
      marginTop: 16,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-2)',
        letterSpacing: '0.1em', marginBottom: 12,
        fontFamily: 'var(--mono)',
      }}>
        CHARTINK WEBHOOK URLS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {urls.map(({ scan, label }) => (
          <div key={scan}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>{label}</div>
            <code style={{
              fontSize: 11, color: 'var(--blue)',
              fontFamily: 'var(--mono)', wordBreak: 'break-all',
            }}>
              {base}/api/webhook?scan={scan}&secret=YOUR_SECRET
            </code>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData]         = useState<DashboardData | null>(null)
  const [tab, setTab]           = useState<'intraday' | 'delivery'>('intraday')
  const [showSettings, setShowSettings] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [pollMs, setPollMs]     = useState<number>(POLLING.IDLE)
  const timeoutRef              = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/signals', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: DashboardData = await res.json()
      setData(json)
      setError(null)

      // Smart polling
      const hasActiveIntraday = json.intraday.length > 0
      if (!json.marketOpen) setPollMs(POLLING.CLOSED)
      else if (hasActiveIntraday) setPollMs(POLLING.ACTIVE)
      else setPollMs(POLLING.IDLE)
    } catch (e) {
      setError('Connection error — retrying')
    }
  }, [])

  useEffect(() => {
    fetchData()
    const schedule = () => {
      timeoutRef.current = setTimeout(() => {
        fetchData().then(schedule)
      }, pollMs)
    }
    schedule()
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [fetchData, pollMs])

  const signals = tab === 'intraday' ? data?.intraday ?? [] : data?.delivery ?? []
  const intradayCount = data?.intraday.length ?? 0
  const deliveryCount = data?.delivery.length ?? 0

  // Window status indicator
  const windowStatus = () => {
    if (!data) return null
    if (!data.marketOpen) return { label: 'Market Closed', color: 'var(--text-3)' }
    if (data.inActiveWindow) return { label: 'Window Active', color: 'var(--green)' }
    return { label: 'Outside Window', color: 'var(--yellow)' }
  }
  const ws = windowStatus()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <header style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="pulse" style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: data?.marketOpen ? 'var(--green)' : 'var(--text-3)',
          }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, letterSpacing: '0.06em' }}>
            TRADING SIGNALS
          </span>
          {ws && (
            <span style={{ fontSize: 11, color: ws.color, fontFamily: 'var(--mono)' }}>
              {ws.label}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {data && (
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
              {data.currentTimeIST} IST
            </span>
          )}
          {error && (
            <span style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'var(--mono)' }}>⚠ {error}</span>
          )}
          <button
            onClick={() => setShowSettings(s => !s)}
            style={{
              background: showSettings ? 'var(--border-lit)' : 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 6, color: 'var(--text-2)',
              padding: '5px 10px', fontSize: 13,
            }}
          >
            ⚙
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '20px 16px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {(['intraday', 'delivery'] as const).map(t => {
            const count = t === 'intraday' ? intradayCount : deliveryCount
            const active = tab === t
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: active ? 'var(--bg-card)' : 'transparent',
                  border: `1px solid ${active ? 'var(--border-lit)' : 'var(--border)'}`,
                  borderRadius: 7, color: active ? 'var(--text)' : 'var(--text-2)',
                  padding: '8px 18px', fontSize: 13, fontWeight: active ? 500 : 400,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {t === 'intraday' ? 'Intraday' : 'Delivery'}
                {count > 0 && (
                  <span style={{
                    fontSize: 11, fontFamily: 'var(--mono)',
                    background: t === 'intraday' ? 'var(--blue-bg)' : 'var(--green-bg)',
                    color: t === 'intraday' ? 'var(--blue)' : 'var(--green)',
                    borderRadius: 8, padding: '1px 7px',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Signal list */}
        {!data ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
            Loading...
          </div>
        ) : signals.length === 0 ? (
          <EmptyState
            tab={tab}
            marketOpen={data.marketOpen}
            inWindow={data.inActiveWindow}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {signals.map(s => (
              <SignalCard key={`${s.scanId}-${s.symbol}`} signal={s} />
            ))}
          </div>
        )}

        {/* Settings panel */}
        {showSettings && data && (
          <>
            <WindowsEditor
              windows={data.windows}
              onSave={(w) => setData(d => d ? { ...d, windows: w } : d)}
            />
            <WebhookRef />
          </>
        )}

      </main>
    </div>
  )
}
