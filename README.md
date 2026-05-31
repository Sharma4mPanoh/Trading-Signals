# Intraday Signal Dashboard

A real-time intraday trading signal dashboard that receives webhook data from Chartink scans, applies a three-tier logic engine, and surfaces only high-confluence entry signals.

---

## Architecture

- **Frontend**: Next.js 14 (React) hosted on Vercel
- **State Store**: Upstash Redis (free tier)
- **Webhook Receiver**: Vercel serverless API routes
- **Smart Polling**: 10s (active signals) / 30s (idle) / 60s (market closed)

---

## Three-Tier Logic

### 🔴 BLOCKED
Stock is excluded from all signals if either fires:
- `I1` — MACD crossed below histogram (3-min)
- `I2` — 10 EMA crossed below VWAP (3-min)

### 🟡 WATCHLIST
Conditions building toward an entry:
- `I3` — Price crossed above VWAP (3-min)
- `I4` — MACD crossed above histogram (5-min)
- `I6` — 10 EMA above 20 EMA (5-min)
- `I7A` — Price within 0.5% of 10 EMA (3-min)
- `I7B` — Price within 0.5% of 20 EMA (3-min)

### 🟢 ENTRY SIGNAL
**Path 1 — VWAP Breakout**: Requires I3 + I4 + I5
**Path 2 — EMA Pullback**: Requires I4 + I6 + (I7A or I7B) + I8

---

## Setup Instructions

### Step 1 — Upstash Redis

1. Go to [upstash.com](https://upstash.com) and create a free account
2. Create a new Redis database — name it `intraday-signals`
3. From the database page → REST API section, copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Step 2 — Local Development (optional)

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/intraday-signals
cd intraday-signals

# Install dependencies
npm install

# Create local env file
cp .env.example .env.local
# Edit .env.local and paste your Upstash credentials

# Run locally
npm run dev
# Open http://localhost:3000
```

### Step 3 — Deploy to Vercel

1. Push this repository to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
3. In Vercel project settings → Environment Variables, add:
   - `UPSTASH_REDIS_REST_URL` — from Upstash dashboard
   - `UPSTASH_REDIS_REST_TOKEN` — from Upstash dashboard
   - `WEBHOOK_SECRET` — any random string e.g. `trading2024`
4. Click Deploy

Your app will be live at: `https://your-project.vercel.app`

### Step 4 — Chartink Webhook Configuration

For each of your 9 Chartink scans, go to the scan's alert settings and paste the corresponding webhook URL:

| Scan | Chartink Webhook URL |
|------|---------------------|
| I1 — MACD below histogram (3-min) | `https://your-app.vercel.app/api/webhook?scan=I1&secret=YOUR_SECRET` |
| I2 — 10 EMA below VWAP (3-min) | `https://your-app.vercel.app/api/webhook?scan=I2&secret=YOUR_SECRET` |
| I3 — Price above VWAP (3-min) | `https://your-app.vercel.app/api/webhook?scan=I3&secret=YOUR_SECRET` |
| I4 — MACD above histogram (5-min) | `https://your-app.vercel.app/api/webhook?scan=I4&secret=YOUR_SECRET` |
| I5 — RSI above 70 (1-min) | `https://your-app.vercel.app/api/webhook?scan=I5&secret=YOUR_SECRET` |
| I6 — 10 EMA above 20 EMA (5-min) | `https://your-app.vercel.app/api/webhook?scan=I6&secret=YOUR_SECRET` |
| I7A — Price near 10 EMA (3-min) | `https://your-app.vercel.app/api/webhook?scan=I7A&secret=YOUR_SECRET` |
| I7B — Price near 20 EMA (3-min) | `https://your-app.vercel.app/api/webhook?scan=I7B&secret=YOUR_SECRET` |
| I8 — RSI between 45-60 (3-min) | `https://your-app.vercel.app/api/webhook?scan=I8&secret=YOUR_SECRET` |

Replace `your-app` with your actual Vercel project name and `YOUR_SECRET` with the `WEBHOOK_SECRET` value you set.

### Step 5 — Testing a Webhook Manually

You can test any scan by visiting this URL in your browser:

```
https://your-app.vercel.app/api/webhook?scan=I3&symbols=RELIANCE,HDFCBANK&secret=YOUR_SECRET
```

This simulates Chartink firing the I3 scan for RELIANCE and HDFCBANK.

### Step 6 — Manual Clear

To reset all signals at end of day:

```
POST https://your-app.vercel.app/api/clear?secret=YOUR_SECRET
```

---

## TTL (Signal Expiry)

| Signal Type | Expires After |
|-------------|--------------|
| Bullish signals | 15 minutes |
| Blocked signals | 30 minutes |

Signals expire automatically — no manual cleanup needed during the trading day.

---

## Signal Counts — Free Tier Safety

| Service | Free Limit | Estimated Usage | Headroom |
|---------|-----------|-----------------|----------|
| Vercel invocations | 100,000/month | ~37,000/month | 63% |
| Upstash Redis commands | 10,000/day | ~1,860/day | 81% |

---

## File Structure

```
intraday-signals/
├── app/
│   ├── page.tsx              — Dashboard UI
│   ├── layout.tsx            — Root layout
│   ├── globals.css           — Global styles
│   └── api/
│       ├── webhook/route.ts  — Receives Chartink webhooks
│       ├── signals/route.ts  — Serves data to dashboard
│       └── clear/route.ts    — Manual reset endpoint
├── lib/
│   ├── constants.ts          — Scan IDs, TTL, polling intervals
│   ├── logic.ts              — Three-tier evaluation engine
│   ├── redis.ts              — Upstash connection
│   └── types.ts              — TypeScript types
├── .env.example              — Environment variable template
├── .gitignore                — Never commits .env.local
├── next.config.js
├── package.json
└── tsconfig.json
```
