# RedmiCoin - Token Launchpad (Pump.fun Clone)

A full-featured clone of pump.fun built with Next.js, TypeScript, and Tailwind CSS. Launch and trade meme tokens using bonding curve mechanics.

## Features

- **Token Feed** — Browse, search, and filter tokens by trending, newest, market cap, or bonding curve progress
- **King of the Hill** — Featured top token by market cap
- **Token Creation** — Create new tokens with name, ticker, description, image, and social links
- **Bonding Curve Trading** — Buy/sell tokens on a constant product bonding curve
- **Price Charts** — Interactive area charts showing token price history
- **Trade History** — View recent buy/sell transactions
- **Comments** — Community discussion thread on each token
- **Wallet Integration** — Connect/disconnect wallet with balance display (demo mode)
- **Dark Theme** — Sleek dark UI matching the pump.fun aesthetic
- **Responsive Design** — Works on mobile, tablet, and desktop

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Recharts** (price charts)
- **Zustand** (state management)
- **Lucide React** (icons)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. **Create a Token** — Fill in the token details and launch with a bonding curve
2. **Buy Tokens** — Use SOL to buy tokens; price increases as more tokens are purchased
3. **Sell Tokens** — Sell tokens back to the bonding curve for SOL
4. **Graduation** — When the bonding curve reaches 100%, the token graduates to DEX

## Pages

- `/` — Home page with token feed, search, filters, and stats
- `/create` — Token creation form
- `/token/[id]` — Token detail page with chart, trading panel, trade history, and comments
