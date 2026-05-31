# Trading Signals Dashboard v2.0

Real-time intraday and delivery trading signal dashboard.
Receives webhooks from Chartink, applies trading window filters, surfaces entry signals only.

---

## Scans & Webhook URLs

| Scan | URL Parameter | Timeframe | Module |
|------|--------------|-----------|--------|
| VWAP Breakout (RSI > 70 + VWAP + MACD) | `scan=VWAP_BREAKOUT` | 1-min/3-min/5-min | Intraday |
| EMA Pullback (10/20 EMA touch + MACD + RSI 45-65) | `scan=EMA_PULLBACK` | 5-min | Intraday |
| Momentum Breakout (Daily) | `scan=MOMENTUM_BREAKOUT` | Daily | Delivery |
| Trend Continuation Pullback (Daily) | `scan=TREND_PULLBACK` | Daily | Delivery |

### Full Webhook URLs
```
https://trading-signals-teal.vercel.app/api/webhook?scan=VWAP_BREAKOUT&secret=YOUR_SECRET
https://trading-signals-teal.vercel.app/api/webhook?scan=EMA_PULLBACK&secret=YOUR_SECRET
https://trading-signals-teal.vercel.app/api/webhook?scan=MOMENTUM_BREAKOUT&secret=YOUR_SECRET
https://trading-signals-teal.vercel.app/api/webhook?scan=TREND_PULLBACK&secret=YOUR_SECRET
```

---

## Signal TTL

| Module | TTL |
|--------|-----|
| Intraday signals | 75 minutes |
| Delivery signals | 28 hours |

---

## Setup

### 1. Upstash Redis
- Create free database at upstash.com
- Region: Asia Pacific (Mumbai)
- Copy REST URL and REST TOKEN

### 2. Vercel Environment Variables
```
UPSTASH_REDIS_REST_URL     = https://your-url.upstash.io
UPSTASH_REDIS_REST_TOKEN   = your-token
WEBHOOK_SECRET             = your-chosen-password
```

### 3. Chartink Alert Settings
- Paste webhook URL into each scan's alert settings
- Frequency: Every 60 minutes (or your preferred interval)
- Trigger: Every time condition is met
- Disable mobile and email alerts

---

## Trading Windows
Configure active windows directly from the dashboard UI (⚙ button).
Default: 09:30–11:00 and 13:00–14:45 IST.
Intraday webhooks received outside these windows are silently ignored.

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/webhook?scan=SCAN_ID&secret=SECRET` | POST/GET | Receive Chartink webhooks |
| `/api/signals` | GET | Fetch dashboard data |
| `/api/windows` | GET/POST | Read/save trading windows |
| `/api/clear?secret=SECRET` | POST | Clear all signals |

---

## Credit Usage Estimate

| Scenario | Credits/month |
|----------|--------------|
| 60-min webhook frequency | ~308 |
| 30-min webhook frequency | ~616 |
| Budget (Premium plan) | 2,000 |
