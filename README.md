# Trading Signals Dashboard v3.0

Rule-based intraday and delivery signal dashboard with trade intelligence.

---

## What's New in v3.0

### Signal Cards
- Manual Entry price, Stop loss, and Target price fields (click to edit, saved to Redis)
- Auto R:R ratio calculated when all three fields are filled
- Stop method indicator per scan type (9 EMA or 20 EMA trail)
- Universal exit rule shown on every card: lose VWAP + 50 EMA → full exit
- Collapsible "Why this signal" rationale section
- Delivery signals show holding period and review-by date

### Session Regime Banner
- Power Hour (09:15–11:00): Hunt aggressively, prefer 1–3% movers, trail 9 EMA
- Graveyard (11:00–13:00): Manage runners only, reduce size 40–50%
- Second Wind (13:00–14:45): Index-aligned only, tight stops
- Updates automatically every minute

### Trading Windows — Always Visible
- Window status now shown permanently on the dashboard (no need to open settings)
- Green/grey dot per window shows active/inactive status
- Edit button opens the full window editor

### Header Status Bar
- Market open/closed, last refresh time, active signal count, window status

### Improved States
- Structured loading, error, and empty states with context
- Error state shows last successful data time

### Compliance
- Disclaimer footer on every page

---

## Stop Method by Scan

| Scan | Trail Method | Logic |
|---|---|---|
| VWAP Breakout | 9 EMA close | Momentum runner regime |
| EMA Pullback | 20 EMA close | Mean reversion regime |
| Momentum Breakout | 20 EMA close | Positional trend |
| Trend Pullback | 20 EMA close | Positional trend |

Universal exit for all: **price loses VWAP + 50 EMA simultaneously → full exit, no trail**

---

## Scans & Webhook URLs

| Scan | Parameter | Timeframe | Module |
|---|---|---|---|
| VWAP Breakout | `scan=VWAP_BREAKOUT` | 1/3/5-min | Intraday |
| EMA Pullback | `scan=EMA_PULLBACK` | 5-min | Intraday |
| Momentum Breakout | `scan=MOMENTUM_BREAKOUT` | Daily | Delivery |
| Trend Pullback | `scan=TREND_PULLBACK` | Daily | Delivery |

```
https://your-app.vercel.app/api/webhook?scan=VWAP_BREAKOUT&secret=YOUR_SECRET
https://your-app.vercel.app/api/webhook?scan=EMA_PULLBACK&secret=YOUR_SECRET
https://your-app.vercel.app/api/webhook?scan=MOMENTUM_BREAKOUT&secret=YOUR_SECRET
https://your-app.vercel.app/api/webhook?scan=TREND_PULLBACK&secret=YOUR_SECRET
```

---

## Signal TTL

| Module | TTL |
|---|---|
| Intraday | 75 minutes |
| Delivery | 28 hours |

---

## Environment Variables (Vercel)

```
UPSTASH_REDIS_REST_URL     = https://your-url.upstash.io
UPSTASH_REDIS_REST_TOKEN   = your-token
WEBHOOK_SECRET             = your-chosen-password
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/webhook?scan=SCAN&secret=SECRET` | POST/GET | Receive Chartink webhooks |
| `/api/signals` | GET | Fetch all active signals |
| `/api/signals/patch` | POST | Save manual entry/SL/target for a signal |
| `/api/windows` | GET/POST | Read/save trading windows |
| `/api/clear?secret=SECRET` | POST | Clear all signals |
