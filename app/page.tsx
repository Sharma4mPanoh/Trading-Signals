'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { Signal, SignalsResponse, TradingWindow, SessionRegime } from '@/lib/types'
import { SCAN_LABELS, SCAN_COLORS, SCAN_TRAIL_METHOD, POLL_ACTIVE, POLL_IDLE, POLL_CLOSED } from '@/lib/constants'

// ─── Session regime helpers (client-side) ────────────────────────────────────

function getClientRegime(): SessionRegime {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const d = now.getDay()
  if (d === 0 || d === 6) return 'CLOSED'
  const m = now.getHours() * 60 + now.getMinutes()
  if (m >= 555 && m < 660)  return 'POWER_HOUR'   // 09:15–11:00
  if (m >= 660 && m < 780)  return 'GRAVEYARD'    // 11:00–13:00
  if (m >= 780 && m < 885)  return 'SECOND_WIND'  // 13:00–14:45
  return 'CLOSED'
}

const REGIME_CONFIG: Record<SessionRegime, { label: string; timeRange: string; instruction: string; color: string; bg: string }> = {
  POWER_HOUR:  { label: 'Power Hour',    timeRange: '09:15 – 11:00', instruction: 'Hunt aggressively. Prefer 1–3% movers. Trail 9 EMA on runners.', color: '#00cc88', bg: '#00cc8815' },
  GRAVEYARD:   { label: 'Graveyard',     timeRange: '11:00 – 13:00', instruction: 'Manage runners only. Reduce size 40–50%. Avoid new breakouts.',    color: '#f0b429', bg: '#f0b42915' },
  SECOND_WIND: { label: 'Second Wind',   timeRange: '13:00 – 14:45', instruction: 'Index-aligned entries only. Tight stops. No new entries after 14:45.', color: '#3d8ef0', bg: '#3d8ef015' },
  CLOSED:      { label: 'Market Closed', timeRange: 'Outside hours', instruction: 'Review signals. Plan for tomorrow.',                               color: '#666',    bg: '#66666610' },
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtAge(mins: number): string {
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata',
  })
}

// ─── Session Banner ───────────────────────────────────────────────────────────

function SessionBanner({ regime }: { regime: SessionRegime }) {
  const cfg = REGIME_CONFIG[regime]
  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid ${cfg.color}30`,
      borderLeft: `3px solid ${cfg.color}`,
      borderRadius: 8,
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    }}>
      <span style={{
        fontSize: 11, fontWeight: 600, color: cfg.color,
        fontFamily: 'var(--mono)', letterSpacing: '0.08em',
        whiteSpace: 'nowrap',
      }}>
        {cfg.label.toUpperCase()}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
        {cfg.timeRange}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1 }}>
        {cfg.instruction}
      </span>
    </div>
  )
}

// ─── Stop method pill ─────────────────────────────────────────────────────────

function StopPill({ scanId }: { scanId: string }) {
  const method = SCAN_TRAIL_METHOD[scanId] ?? 'EMA_20'
  const is9 = method === 'EMA_9'
  return (
    <span style={{
      fontSize: 10, padding: '2px 7px', borderRadius: 4,
      fontFamily: 'var(--mono)', letterSpacing: '0.04em',
      background: is9 ? '#00cc8818' : '#a78bfa18',
      color:      is9 ? '#00cc88'   : '#a78bfa',
      border:     `1px solid ${is9 ? '#00cc8835' : '#a78bfa35'}`,
    }}>
      Trail: {is9 ? '9 EMA close' : '20 EMA close'}
    </span>
  )
}

// ─── Price Field (inline editable) ────────────────────────────────────────────

function PriceField({
  label, value, color, onSave,
}: {
  label: string; value: number | null | undefined; color: string; onSave: (v: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(value != null ? String(value) : '')
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commit() {
    const n = parseFloat(draft)
    onSave(isNaN(n) ? null : n)
    setEditing(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter')  commit()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 80 }}>
      <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKey}
          placeholder="0.00"
          style={{
            background: 'var(--bg-input)',
            border: `1px solid ${color}60`,
            borderRadius: 4,
            color: color,
            fontFamily: 'var(--mono)',
            fontSize: 13,
            fontWeight: 600,
            padding: '2px 6px',
            width: 80,
            outline: 'none',
          }}
        />
      ) : (
        <span
          onClick={startEdit}
          title="Click to edit"
          style={{
            fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600,
            color: value != null ? color : 'var(--text-3)',
            cursor: 'pointer',
            borderBottom: `1px dashed ${value != null ? color + '50' : 'var(--border)'}`,
            paddingBottom: 1,
          }}
        >
          {value != null ? `₹${value.toLocaleString('en-IN')}` : '— set'}
        </span>
      )}
    </div>
  )
}

// ─── Signal Card ──────────────────────────────────────────────────────────────

function SignalCard({ signal, onPatch }: {
  signal: Signal
  onPatch: (symbol: string, module: string, fields: Partial<Pick<Signal, 'entryPrice' | 'stopLoss' | 'targetPrice'>>) => void
}) {
  const [showRationale, setShowRationale] = useState(false)
  const color = SCAN_COLORS[signal.scanId] ?? '#3d8ef0'
  const label = SCAN_LABELS[signal.scanId] ?? signal.scanId

  function saveField(field: 'entryPrice' | 'stopLoss' | 'targetPrice', val: number | null) {
    onPatch(signal.symbol, signal.module, { [field]: val })
  }

  // R:R display
  let rrDisplay: string | null = null
  if (signal.entryPrice && signal.stopLoss && signal.targetPrice) {
    const risk   = signal.entryPrice - signal.stopLoss
    const reward = signal.targetPrice - signal.entryPrice
    if (risk > 0 && reward > 0) rrDisplay = `1 : ${(reward / risk).toFixed(1)}`
  }

  return (
    <div className="fade-up" style={{
      background: 'var(--bg-card)',
      border: `1px solid ${color}28`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 8,
      padding: '14px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: `${color}06`, pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>

        {/* Row 1: symbol + badge + age */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Status dot */}
            <span className="pulse" style={{
              display: 'inline-block', width: 7, height: 7,
              borderRadius: '50%', background: color, flexShrink: 0,
            }} />
            {/* Symbol */}
            <span style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.04em' }}>
              {signal.symbol}
            </span>
            {/* Scan badge */}
            <span style={{
              fontSize: 11, fontWeight: 500, color,
              background: `${color}18`, border: `1px solid ${color}35`,
              borderRadius: 4, padding: '2px 8px', fontFamily: 'var(--mono)',
            }}>
              {label}
            </span>
            <StopPill scanId={signal.scanId} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
              {fmtAge(signal.signalAgeMinutes)}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
              {fmtTime(signal.receivedAt)}
            </span>
          </div>
        </div>

        {/* Row 2: universal exit rule */}
        <div style={{
          fontSize: 11, color: '#e05252', fontFamily: 'var(--mono)',
          background: '#e0525210', border: '1px solid #e0525225',
          borderRadius: 4, padding: '3px 8px', marginBottom: 12,
          display: 'inline-block',
        }}>
          Exit trigger: loses VWAP + 50 EMA simultaneously → full exit
        </div>

        {/* Row 3: price fields */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: rrDisplay ? 10 : 0 }}>
          <PriceField label="Entry" value={signal.entryPrice} color={color} onSave={v => saveField('entryPrice', v)} />
          <PriceField label="Stop loss" value={signal.stopLoss} color="#e05252" onSave={v => saveField('stopLoss', v)} />
          <PriceField label="Target" value={signal.targetPrice} color="#00cc88" onSave={v => saveField('targetPrice', v)} />
          {rrDisplay && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>R:R</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: '#00cc88' }}>{rrDisplay}</span>
            </div>
          )}
        </div>

        {/* Delivery: review date */}
        {signal.module === 'DELIVERY' && (
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
            Holding: 3–10 days · Review by: {new Date(new Date(signal.receivedAt).getTime() + 7 * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </div>
        )}

        {/* Rationale toggle */}
        {signal.description && (
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => setShowRationale(r => !r)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)',
                padding: 0, display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <span style={{ fontSize: 10 }}>{showRationale ? '▾' : '▸'}</span>
              Why this signal
            </button>
            {showRationale && (
              <div style={{
                marginTop: 6, fontSize: 11, color: 'var(--text-2)',
                fontFamily: 'var(--mono)', lineHeight: 1.6,
                background: 'var(--bg-subtle)', borderRadius: 4, padding: '6px 10px',
              }}>
                {signal.description}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Trading Windows strip (always visible) ────────────────────────────────────

function WindowsStrip({ windows, onOpenEditor }: {
  windows: TradingWindow[]
  onOpenEditor: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      background: 'var(--bg-subtle)', border: '1px solid var(--border)',
      borderRadius: 6, padding: '7px 12px', marginBottom: 14,
    }}>
      <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)', marginRight: 4 }}>
        WINDOWS
      </span>
      {windows.map((w, i) => (
        <span key={i} style={{
          fontSize: 11, fontFamily: 'var(--mono)',
          color: w.enabled ? '#00cc88' : 'var(--text-3)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: w.enabled ? '#00cc88' : 'var(--text-3)',
            display: 'inline-block',
          }} />
          {w.label}: {w.start}–{w.end}
        </span>
      ))}
      <button
        onClick={onOpenEditor}
        style={{
          marginLeft: 'auto', background: 'none', border: '1px solid var(--border)',
          borderRadius: 4, padding: '2px 8px', cursor: 'pointer',
          fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--mono)',
        }}
      >
        edit
      </button>
    </div>
  )
}

// ─── Windows Editor ────────────────────────────────────────────────────────────

function WindowsEditor({ windows, onSave }: {
  windows: TradingWindow[]
  onSave: (w: TradingWindow[]) => void
}) {
  const [local, setLocal] = useState<TradingWindow[]>(windows)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await fetch('/api/windows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ windows: local }) })
      onSave(local)
    } finally { setSaving(false) }
  }

  function update(i: number, field: keyof TradingWindow, value: string | boolean) {
    setLocal(ws => ws.map((w, idx) => idx === i ? { ...w, [field]: value } : w))
  }

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: 16, marginTop: 12,
    }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 12, fontFamily: 'var(--mono)' }}>
        TRADING WINDOWS
      </div>
      {local.map((w, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <input
            type="checkbox"
            checked={w.enabled}
            onChange={e => update(i, 'enabled', e.target.checked)}
          />
          <span style={{ fontSize: 12, color: 'var(--text-2)', minWidth: 120 }}>{w.label}</span>
          <input type="time" value={w.start} onChange={e => update(i, 'start', e.target.value)}
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', padding: '3px 8px', fontSize: 12, fontFamily: 'var(--mono)' }} />
          <span style={{ color: 'var(--text-3)' }}>–</span>
          <input type="time" value={w.end} onChange={e => update(i, 'end', e.target.value)}
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', padding: '3px 8px', fontSize: 12, fontFamily: 'var(--mono)' }} />
        </div>
      ))}
      <button onClick={save} disabled={saving} style={{
        marginTop: 4, background: '#3d8ef020', border: '1px solid #3d8ef050',
        borderRadius: 5, color: '#3d8ef0', padding: '6px 16px',
        cursor: saving ? 'default' : 'pointer', fontSize: 12, fontFamily: 'var(--mono)',
      }}>
        {saving ? 'Saving…' : 'Save windows'}
      </button>
    </div>
  )
}

// ─── Webhook reference ─────────────────────────────────────────────────────────

function WebhookRef() {
  const scans = ['VWAP_BREAKOUT', 'EMA_PULLBACK', 'MOMENTUM_BREAKOUT', 'TREND_PULLBACK']
  const [host, setHost] = useState('')
  useEffect(() => { setHost(window.location.origin) }, [])
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 10, fontFamily: 'var(--mono)' }}>
        WEBHOOK URLS
      </div>
      {scans.map(s => (
        <div key={s} style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)', marginBottom: 6, wordBreak: 'break-all' }}>
          {host}/api/webhook?scan={s}&secret=YOUR_SECRET
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ tab, marketOpen, inWindow }: { tab: string; marketOpen: boolean; inWindow: boolean }) {
  let msg = 'No active signals'
  let sub = ''
  if (!marketOpen)      { msg = 'Market is closed'; sub = 'Signals will appear during market hours.' }
  else if (!inWindow)   { msg = 'Outside trading window'; sub = 'Intraday webhooks are filtered. Edit windows above.' }
  else if (tab === 'delivery') { msg = 'No delivery signals'; sub = 'Daily scan results will appear here.' }
  else                         { sub = 'Watching for Chartink signals…' }

  return (
    <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-3)' }}>
      <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 6 }}>{msg}</div>
      {sub && <div style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>{sub}</div>}
    </div>
  )
}

// ─── Header status bar ─────────────────────────────────────────────────────────

function HeaderBar({ data, regime }: { data: SignalsResponse; regime: SessionRegime }) {
  const cfg = REGIME_CONFIG[regime]
  const total = data.intraday.length + data.delivery.length
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      marginBottom: 16, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-3)',
    }}>
      <span style={{ color: data.marketOpen ? '#00cc88' : '#e05252', fontWeight: 600 }}>
        {data.marketOpen ? '● OPEN' : '● CLOSED'}
      </span>
      <span>Last refresh: {data.lastRefreshed}</span>
      {total > 0 && <span>Active signals: {total}</span>}
      <span style={{ color: data.inActiveWindow ? '#00cc88' : 'var(--text-3)' }}>
        {data.inActiveWindow ? '● In window' : '○ Outside window'}
      </span>
      <span style={{ color: cfg.color }}>
        {cfg.label}
      </span>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [data, setData]             = useState<SignalsResponse | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [tab, setTab]               = useState<'intraday' | 'delivery'>('intraday')
  const [showSettings, setShowSettings] = useState(false)
  const [regime, setRegime]         = useState<SessionRegime>('CLOSED')
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Update regime every minute client-side
  useEffect(() => {
    setRegime(getClientRegime())
    const t = setInterval(() => setRegime(getClientRegime()), 60_000)
    return () => clearInterval(t)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/signals')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d: SignalsResponse = await res.json()
      setData(d)
      setError(null)
      return d
    } catch (e) {
      setError('Could not reach signal engine. Check your connection.')
      return null
    }
  }, [])

  // Smart polling
  useEffect(() => {
    let cancelled = false
    async function poll() {
      if (cancelled) return
      const d = await fetchData()
      if (cancelled) return
      const interval =
        !d            ? POLL_IDLE :
        !d.marketOpen ? POLL_CLOSED :
        d.inActiveWindow ? POLL_ACTIVE : POLL_IDLE
      pollRef.current = setTimeout(poll, interval)
    }
    poll()
    return () => {
      cancelled = true
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [fetchData])

  // Patch signal prices
  async function handlePatch(symbol: string, module: string, fields: Partial<Pick<Signal, 'entryPrice' | 'stopLoss' | 'targetPrice'>>) {
    try {
      const res = await fetch('/api/signals/patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, module, ...fields }),
      })
      if (res.ok) {
        const { signal: updated } = await res.json()
        setData(d => {
          if (!d) return d
          const patchList = (list: Signal[]) =>
            list.map(s => s.symbol === symbol && s.module === module ? { ...s, ...updated } : s)
          return { ...d, intraday: patchList(d.intraday), delivery: patchList(d.delivery) }
        })
      }
    } catch { /* silently ignore */ }
  }

  const signals = tab === 'intraday' ? (data?.intraday ?? []) : (data?.delivery ?? [])
  const intradayCount = data?.intraday.length ?? 0
  const deliveryCount = data?.delivery.length ?? 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <style>{`
        :root {
          --bg:         #0d0f12;
          --bg-card:    #13161b;
          --bg-subtle:  #0f1115;
          --bg-input:   #1a1d24;
          --text:       #e8eaf0;
          --text-2:     #a0a8b8;
          --text-3:     #5a6070;
          --border:     #1e2230;
          --border-lit: #2a2f40;
          --mono:       'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
          --blue:       #3d8ef0;
          --blue-bg:    #3d8ef015;
          --green:      #00cc88;
          --green-bg:   #00cc8815;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0px currentColor; opacity: 0.8; }
          70%  { box-shadow: 0 0 0 5px currentColor; opacity: 0; }
          100% { box-shadow: 0 0 0 0px currentColor; opacity: 0; }
        }
        .fade-up { animation: fadeUp 0.25s ease both; }
        .pulse   { animation: pulseRing 2s infinite; }
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
      `}</style>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '0.08em', fontFamily: 'var(--mono)', color: 'var(--text)' }}>
              TRADING SIGNALS
            </h1>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
              Rule-based · NSE · Personal research only
            </div>
          </div>
          <button
            onClick={() => setShowSettings(s => !s)}
            style={{
              background: showSettings ? 'var(--bg-card)' : 'transparent',
              border: `1px solid ${showSettings ? 'var(--border-lit)' : 'var(--border)'}`,
              borderRadius: 7, color: 'var(--text-2)', padding: '7px 12px',
              cursor: 'pointer', fontSize: 16,
            }}
          >
            ⚙
          </button>
        </div>

        {/* Header status bar */}
        {data && <HeaderBar data={data} regime={regime} />}

        {/* Trading windows strip — always visible */}
        {data && (
          <WindowsStrip
            windows={data.windows}
            onOpenEditor={() => setShowSettings(s => !s)}
          />
        )}

        {/* Session regime banner */}
        <SessionBanner regime={regime} />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
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
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {t === 'intraday' ? 'Intraday' : (
                  <>
                    Delivery
                    <span title="Positional trades. Typical holding: 3–10 days. Not intraday." style={{ cursor: 'help', opacity: 0.5, fontSize: 11 }}>ⓘ</span>
                  </>
                )}
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
        {error ? (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <div style={{ fontSize: 13, color: '#e05252', marginBottom: 8 }}>{error}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
              {data ? `Last successful data: ${data.lastRefreshed}` : 'Retrying…'}
            </div>
          </div>
        ) : !data ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
            <div style={{ marginBottom: 8 }}>Fetching signals…</div>
            <div style={{ fontSize: 11 }}>Connecting to signal engine</div>
          </div>
        ) : signals.length === 0 ? (
          <EmptyState tab={tab} marketOpen={data.marketOpen} inWindow={data.inActiveWindow} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {signals.map(s => (
              <SignalCard
                key={`${s.scanId}-${s.symbol}`}
                signal={s}
                onPatch={handlePatch}
              />
            ))}
          </div>
        )}

        {/* Settings panel */}
        {showSettings && data && (
          <>
            <WindowsEditor
              windows={data.windows}
              onSave={w => setData(d => d ? { ...d, windows: w } : d)}
            />
            <WebhookRef />
          </>
        )}

        {/* Disclaimer */}
        <div style={{
          marginTop: 48, paddingTop: 16, borderTop: '1px solid var(--border)',
          fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)', lineHeight: 1.7,
          textAlign: 'center',
        }}>
          For personal research and educational use only. Not SEBI-registered investment advice.
          Past signal performance does not guarantee future results.
          Always verify prices before acting. Use your own judgement.
        </div>

      </main>
    </div>
  )
}
