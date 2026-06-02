import type { SessionInfo, SessionRegime } from './types'
import { SESSION_WINDOWS } from './constants'

export function nowIST(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function isMarketOpen(): boolean {
  const now = nowIST()
  const day = now.getDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false
  const mins = now.getHours() * 60 + now.getMinutes()
  return mins >= timeToMinutes('09:15') && mins < timeToMinutes('15:30')
}

export function isInTradingWindow(windows: { start: string; end: string; enabled: boolean }[]): boolean {
  const now = nowIST()
  const mins = now.getHours() * 60 + now.getMinutes()
  return windows.some(w => {
    if (!w.enabled) return false
    return mins >= timeToMinutes(w.start) && mins < timeToMinutes(w.end)
  })
}

export function getSessionRegime(): SessionRegime {
  const now = nowIST()
  const day = now.getDay()
  if (day === 0 || day === 6) return 'CLOSED'
  const mins = now.getHours() * 60 + now.getMinutes()
  const { POWER_HOUR, GRAVEYARD, SECOND_WIND } = SESSION_WINDOWS
  if (mins >= timeToMinutes(POWER_HOUR.start)  && mins < timeToMinutes(POWER_HOUR.end))  return 'POWER_HOUR'
  if (mins >= timeToMinutes(GRAVEYARD.start)   && mins < timeToMinutes(GRAVEYARD.end))   return 'GRAVEYARD'
  if (mins >= timeToMinutes(SECOND_WIND.start) && mins < timeToMinutes(SECOND_WIND.end)) return 'SECOND_WIND'
  return 'CLOSED'
}

export function getSessionInfo(regime: SessionRegime): SessionInfo {
  const map: Record<SessionRegime, SessionInfo> = {
    POWER_HOUR: {
      regime,
      label:       'Power Hour',
      timeRange:   '09:15 – 11:00',
      instruction: 'Hunt aggressively. Prefer 1–3% movers. Trail 9 EMA on runners.',
      color:       '#00cc88',
    },
    GRAVEYARD: {
      regime,
      label:       'Graveyard',
      timeRange:   '11:00 – 13:00',
      instruction: 'Manage runners only. Reduce size 40–50%. Avoid new breakouts.',
      color:       '#f0b429',
    },
    SECOND_WIND: {
      regime,
      label:       'Second Wind',
      timeRange:   '13:00 – 14:45',
      instruction: 'Index-aligned entries only. Tight stops. No new entries after 14:45.',
      color:       '#3d8ef0',
    },
    CLOSED: {
      regime,
      label:       'Market Closed',
      timeRange:   'Outside hours',
      instruction: 'Review signals. Plan for tomorrow.',
      color:       '#666',
    },
  }
  return map[regime]
}

export function istTimeString(): string {
  return nowIST().toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export function fmtIST(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata',
  })
}
