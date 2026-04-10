# Testing RedmiCoin (Pump.fun Clone)

## Overview
RedmiCoin is a frontend-only pump.fun clone built with Next.js 14, TypeScript, Tailwind CSS, Zustand, and Recharts. All state is in-memory (no backend, no blockchain). Wallet connection is simulated.

## Running Locally
```bash
cd /home/ubuntu/repos/redmicoin
npm install
npm run dev  # Starts at http://localhost:3000
```

## Key Pages
- `/` — Home page with token feed, search, sort, King of the Hill
- `/create` — Token creation form (requires wallet connection)
- `/token/[id]` — Token detail with chart, trade panel, comments, trade history

## Testing Flows

### 1. Home Page
- Verify 12 mock tokens render in grid
- Test search filtering (type in search bar, verify filtered results)
- Test sort buttons (Trending, Newest, Market Cap, Progress)
- Verify King of the Hill section shows highest market cap token

### 2. Wallet Connection
- Click "Connect Wallet" in navbar
- Verify balance shows 100.0000 SOL and shortened address appears
- Click disconnect button to verify wallet disconnects

### 3. Trading (Buy/Sell)
- Navigate to any token detail page
- **Buy**: Enter SOL amount, verify estimate shows tokens to receive, click Buy
- **Sell**: Switch to Sell tab, verify token balance is shown, enter amount, click Sell
- **Ownership validation**: Sell tab should show 0 balance before buying; sell button should be disabled if amount > balance

### 4. Bonding Curve Math Verification
The most critical test: buy tokens with X SOL, then immediately sell them back. The SOL returned should be approximately equal to X SOL (within ~1% for small trades). If selling returns significantly less (e.g., 50%), the bonding curve invariant is broken.

**How it works**: The constant product invariant K = INITIAL_VIRTUAL_SOL * INITIAL_VIRTUAL_TOKENS should remain constant across all operations. The current virtual SOL is derived as K / remainingTokens.

### 5. Create Token
- Navigate to `/create`
- Fill in name, ticker, description (required fields)
- Click "Launch Token"
- Verify redirect to new token's detail page with 0% progress

## Known Issues
- React hydration mismatch on initial page load due to `Math.random()` in mock data generation. This causes console warnings but doesn't affect functionality.
- All state resets on page refresh (no persistence).

## Devin Secrets Needed
None — this is a frontend-only demo app with simulated wallet. No API keys, database credentials, or blockchain RPC endpoints required.

## Key Files
- `src/lib/bonding-curve.ts` — Core pricing math (constant product formula)
- `src/lib/store.ts` — Zustand store with buy/sell/create/comment actions
- `src/lib/types.ts` — TypeScript interfaces (Token, WalletState, Trade, etc.)
- `src/lib/mock-data.ts` — 12 pre-generated mock tokens
- `src/components/TradePanel.tsx` — Buy/sell UI with balance display
