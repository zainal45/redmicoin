/**
 * ============================================================
 *  PUMPLIVE — Bonding Curve Engine v2 — Unit Tests
 *  (NO BURN / Reserve Pool Architecture)
 * ============================================================
 *
 *  Tests to prove:
 *  1. Mathematical Integrity — no balance leakage
 *  2. Integral pricing (NOT Total × Current_Price)
 *  3. Fee system accuracy (configurable per call)
 *  4. Reserve pool mechanics — tokens NEVER burned
 *  5. Liquidity always matches integral
 *  6. No arbitrage exploits
 *  7. State consistency after every trade
 *  8. Market metrics accuracy (MarketCap, FDV)
 *  9. Numerical precision under stress
 *  10. Anti-manipulation rules enforced
 *
 * ============================================================
 */

const {
  CONFIG,
  FP_TOLERANCE,
  createInitialState,
  getPrice,
  integralCost,
  solveTokensForBudget,
  buy,
  sell,
  getMarketCap,
  getFDV,
  getLiquidity,
  getReserveTokens,
  estimateBuy,
  estimateSell,
  verifyIntegrity,
  getPriceChangePercent,
} = require('./bondingCurveEngine');

// ── Helpers ──────────────────────────────────────────────────
const EPSILON = 1e-6;
const BUY_FEE = CONFIG.BUY_FEE_RATE;
const SELL_FEE = CONFIG.SELL_FEE_RATE;

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

function assertApprox(actual, expected, testName, eps = EPSILON) {
  const ok = Math.abs(actual - expected) < eps;
  if (ok) {
    passed++;
    console.log(`  ✓ ${testName} (${actual.toFixed(6)} ≈ ${expected.toFixed(6)})`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${testName} — expected ${expected}, got ${actual}`);
  }
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 1: Configuration ═══');
// ══════════════════════════════════════════════════════════════
assert(CONFIG.MAX_SUPPLY === 1_000_000_000, 'Max supply = 1 Billion');
assert(CONFIG.INITIAL_PRICE === 100, 'Initial price (a) = Rp 100');
assert(CONFIG.TARGET_PRICE === 300, 'Target price = Rp 300');
assert(CONFIG.BUY_FEE_RATE === 0.08, 'Buy fee = 8%');
assert(CONFIG.SELL_FEE_RATE === 0.04, 'Sell fee = 4%');
assertApprox(CONFIG.SLOPE, 2e-7, 'Slope (b) = 2e-7', 1e-15);

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 2: Price Function P(x) = a + b*x ═══');
// ══════════════════════════════════════════════════════════════
assertApprox(getPrice(0), 100, 'P(0) = Rp 100 (initial price)');
assertApprox(getPrice(500_000_000), 200, 'P(500M) = Rp 200');
assertApprox(getPrice(1_000_000_000), 300, 'P(1B) = Rp 300 (target price)');
assert(getPrice(0) >= CONFIG.INITIAL_PRICE, 'Price never below initial');

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 3: Integral Cost ═══');
// ══════════════════════════════════════════════════════════════
{
  // ∫[0..1000] (100 + 2e-7·x) dx = 100·1000 + 2e-7·1000·1000/2 = 100000.1
  const cost = integralCost(0, 1000);
  assertApprox(cost, 100000.1, 'Integral cost of 1000 tokens from x=0', 0.01);
}
{
  const cost = integralCost(500_000_000, 1000);
  assertApprox(cost, 200000.1, 'Integral cost of 1000 tokens from x=500M', 1);
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 4: Quadratic Solver ═══');
// ══════════════════════════════════════════════════════════════
{
  const budget = integralCost(0, 1000);
  const tokens = solveTokensForBudget(0, budget);
  assertApprox(tokens, 1000, 'Solver returns 1000 tokens for exact budget', 0.01);
}
{
  assert(solveTokensForBudget(0, 0) === 0, 'Zero budget → zero tokens');
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 5: buy() — Basic ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();
  const result = buy(1_000_000, BUY_FEE, state);

  assert(result.tokensReceived > 0, 'Received tokens > 0');
  assert(result.fee > 0, 'Fee collected > 0');
  assertApprox(result.fee, 1_000_000 * 0.08, 'Fee = 8% of input', 1);
  assert(result.newPrice > CONFIG.INITIAL_PRICE, 'Price increased after buy');
  assert(result.state.circulatingSupply > 0, 'Circulating supply increased');
  assert(result.state.liquidity > 0, 'Pool has liquidity');
  assert(result.state.adminBalance > 0, 'Admin received fee');

  // First buy: all tokens should be newly minted (no reserve)
  assert(result.fromReserve === 0, 'First buy: 0 from reserve');
  assert(result.newlyMinted === result.tokensReceived, 'First buy: all newly minted');
  assert(result.state.totalMinted === result.tokensReceived, 'totalMinted tracked');

  console.log(`    → Bought: ${result.tokensReceived.toFixed(2)} tokens`);
  console.log(`    → Avg price: Rp ${result.averagePrice.toFixed(4)}`);
  console.log(`    → New price: Rp ${result.newPrice.toFixed(4)}`);
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 6: sell() — Basic (NO BURN) ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();
  const buyResult = buy(1_000_000, BUY_FEE, state);
  const sellResult = sell(buyResult.tokensReceived, SELL_FEE, buyResult.state);

  assert(sellResult.rupiahReceived > 0, 'Received Rupiah > 0');
  assert(sellResult.fee > 0, 'Sell fee collected > 0');
  assert(sellResult.rupiahReceived < 1_000_000, 'Received less than paid (fees)');
  assertApprox(sellResult.state.circulatingSupply, 0, 'Circulating supply back to 0', 0.01);
  assert(sellResult.newPrice >= CONFIG.INITIAL_PRICE, 'Price back to initial');

  // KEY: tokens NOT burned — they go to reserve
  assertApprox(
    sellResult.state.reserveTokens,
    buyResult.tokensReceived,
    'Sold tokens moved to reserve (NOT burned)',
    0.01
  );
  // totalMinted should NOT decrease on sell
  assertApprox(
    sellResult.state.totalMinted,
    buyResult.tokensReceived,
    'totalMinted unchanged after sell (no burn)',
    0.01
  );

  console.log(`    → Received: Rp ${sellResult.rupiahReceived.toFixed(2)}`);
  console.log(`    → Reserve tokens: ${sellResult.state.reserveTokens.toFixed(2)}`);
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 7: Reserve Pool — Buy from Reserve ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();

  // Buy tokens
  const buy1 = buy(1_000_000, BUY_FEE, state);
  const tokensBought = buy1.tokensReceived;

  // Sell all — tokens go to reserve
  const sellResult = sell(tokensBought, SELL_FEE, buy1.state);
  assert(sellResult.state.reserveTokens > 0, 'Reserve has tokens after sell');
  const reserveBefore = sellResult.state.reserveTokens;
  const mintedBefore = sellResult.state.totalMinted;

  // Buy again — should take from reserve first, NOT mint new
  const buy2 = buy(500_000, BUY_FEE, sellResult.state);
  assert(buy2.fromReserve > 0, 'Second buy takes from reserve');

  if (buy2.tokensReceived <= reserveBefore) {
    assert(buy2.newlyMinted === 0, 'No new minting when reserve covers demand');
    assertApprox(
      buy2.state.totalMinted,
      mintedBefore,
      'totalMinted unchanged when buying from reserve',
      0.01
    );
  }

  assertApprox(
    buy2.state.reserveTokens,
    reserveBefore - buy2.fromReserve,
    'Reserve decreased by fromReserve amount',
    0.01
  );

  console.log(`    → Reserve before: ${reserveBefore.toFixed(2)}`);
  console.log(`    → Bought: ${buy2.tokensReceived.toFixed(2)} (from reserve: ${buy2.fromReserve.toFixed(2)}, minted: ${buy2.newlyMinted.toFixed(2)})`);
  console.log(`    → Reserve after: ${buy2.state.reserveTokens.toFixed(2)}`);
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 8: Reserve Pool — Partial Reserve + Mint ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();

  // Buy small amount → sell → creates small reserve
  const buy1 = buy(100_000, BUY_FEE, state);
  const sell1 = sell(buy1.tokensReceived, SELL_FEE, buy1.state);
  const smallReserve = sell1.state.reserveTokens;

  // Buy larger amount — should exhaust reserve and mint the rest
  const buy2 = buy(1_000_000, BUY_FEE, sell1.state);
  assertApprox(buy2.fromReserve, smallReserve, 'Used all reserve tokens', 0.01);
  assert(buy2.newlyMinted > 0, 'Had to mint additional tokens');
  assertApprox(
    buy2.tokensReceived,
    buy2.fromReserve + buy2.newlyMinted,
    'Total = fromReserve + newlyMinted',
    0.01
  );
  assertApprox(buy2.state.reserveTokens, 0, 'Reserve fully depleted', 0.01);

  console.log(`    → Small reserve: ${smallReserve.toFixed(2)}`);
  console.log(`    → From reserve: ${buy2.fromReserve.toFixed(2)}, Minted: ${buy2.newlyMinted.toFixed(2)}`);
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 9: Integral vs Naive Pricing ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();
  const result = buy(10_000_000, BUY_FEE, state);

  const naiveValue = result.tokensReceived * result.newPrice;
  const integralValue = result.state.liquidity;

  assert(naiveValue > integralValue, 'Naive overestimates (INTEGRAL IS CORRECT)');
  console.log(`    → Naive:    Rp ${naiveValue.toFixed(2)}`);
  console.log(`    → Integral: Rp ${integralValue.toFixed(2)}`);
  console.log(`    → Overestimate: ${(((naiveValue - integralValue) / integralValue) * 100).toFixed(4)}%`);
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 10: No Balance Leakage (5 users) ═══');
// ══════════════════════════════════════════════════════════════
{
  let currentState = createInitialState();
  const purchases = [];

  for (let i = 0; i < 5; i++) {
    const result = buy(2_000_000, BUY_FEE, currentState);
    purchases.push(result);
    currentState = result.state;
  }

  console.log(`    → After 5 buys: ${currentState.circulatingSupply.toFixed(2)} circulating`);
  console.log(`    → Liquidity: Rp ${currentState.liquidity.toFixed(2)}`);

  for (let i = purchases.length - 1; i >= 0; i--) {
    const result = sell(purchases[i].tokensReceived, SELL_FEE, currentState);
    currentState = result.state;
  }

  assert(currentState.liquidity >= -EPSILON, 'Liquidity >= 0 after all sells (NO LEAKAGE)');
  assertApprox(currentState.circulatingSupply, 0, 'Circulating supply back to 0', 0.01);
  assert(currentState.price >= CONFIG.INITIAL_PRICE - EPSILON, 'Price back to initial');
  // All sold tokens should be in reserve
  assert(currentState.reserveTokens > 0, 'Sold tokens accumulated in reserve');
  console.log(`    → Final liquidity: Rp ${currentState.liquidity.toFixed(6)}`);
  console.log(`    → Reserve tokens: ${currentState.reserveTokens.toFixed(2)}`);
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 11: Pool Always Solvent (Multi-User Simulation) ═══');
// ══════════════════════════════════════════════════════════════
{
  let currentState = createInitialState();
  const userTokens = [0, 0, 0];
  const txPlan = [
    { action: 'buy', user: 0, amount: 5_000_000 },
    { action: 'buy', user: 1, amount: 3_000_000 },
    { action: 'buy', user: 2, amount: 8_000_000 },
    { action: 'sell', user: 0, fraction: 0.5 },
    { action: 'buy', user: 1, amount: 2_000_000 },
    { action: 'sell', user: 2, fraction: 0.3 },
    { action: 'buy', user: 0, amount: 1_000_000 },
    { action: 'sell', user: 1, fraction: 1.0 },
    { action: 'buy', user: 2, amount: 4_000_000 },
    { action: 'sell', user: 0, fraction: 1.0 },
  ];

  let solvent = true;
  for (const tx of txPlan) {
    try {
      if (tx.action === 'buy') {
        const r = buy(tx.amount, BUY_FEE, currentState);
        userTokens[tx.user] += r.tokensReceived;
        currentState = r.state;
      } else {
        const sellAmount = userTokens[tx.user] * tx.fraction;
        if (sellAmount > 0) {
          const r = sell(sellAmount, SELL_FEE, currentState);
          userTokens[tx.user] -= sellAmount;
          currentState = r.state;
        }
      }
      if (currentState.liquidity < -EPSILON) {
        solvent = false;
        break;
      }
    } catch (e) {
      // Expected for edge cases
    }
  }

  assert(solvent, 'Pool stays solvent through all transactions');
  assert(currentState.liquidity >= -EPSILON, 'Liquidity never went negative');
  console.log(`    → Final liquidity: Rp ${currentState.liquidity.toFixed(2)}`);
  console.log(`    → Reserve tokens: ${currentState.reserveTokens.toFixed(2)}`);
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 12: Initial Price Protection ═══');
// ══════════════════════════════════════════════════════════════
{
  assert(getPrice(0) === CONFIG.INITIAL_PRICE, 'Price at x=0 = initial price');
  const state = createInitialState();
  const b = buy(1_000_000, BUY_FEE, state);
  const s = sell(b.tokensReceived, SELL_FEE, b.state);
  assert(s.newPrice >= CONFIG.INITIAL_PRICE, 'Price after full sell >= initial');
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 13: Fee Accuracy ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();
  const buyResult = buy(1_000_000, BUY_FEE, state);

  assertApprox(buyResult.fee, 80_000, 'Buy fee = Rp 80,000 (8% of 1M)', 1);
  assertApprox(buyResult.netCost + buyResult.fee, buyResult.totalPaid, 'netCost + fee = totalPaid', 1);

  const sellResult = sell(buyResult.tokensReceived, SELL_FEE, buyResult.state);
  assertApprox(sellResult.fee, sellResult.grossProceeds * 0.04, 'Sell fee = 4% of gross', 0.01);
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 14: Estimate Functions (Read-Only) ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();

  const buyEst = estimateBuy(1_000_000, BUY_FEE, state);
  assert(buyEst !== null, 'Buy estimate returns result');
  assert(buyEst.tokensEstimate > 0, 'Estimated tokens > 0');
  assert(buyEst.priceImpact > 0, 'Price impact > 0 for buy');
  assert(buyEst.fromReserve === 0, 'No reserve on fresh state');
  assert(buyEst.newlyMinted > 0, 'All newly minted on fresh state');

  const buyResult = buy(1_000_000, BUY_FEE, state);
  assertApprox(buyEst.tokensEstimate, buyResult.tokensReceived, 'Estimate matches actual', 0.01);

  const sellEst = estimateSell(buyResult.tokensReceived, SELL_FEE, buyResult.state);
  assert(sellEst !== null, 'Sell estimate returns result');
  assert(sellEst.priceImpact < 0, 'Price impact < 0 for sell');
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 15: Edge Cases ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();

  try { buy(0, BUY_FEE, state); assert(false, 'Zero buy'); }
  catch (e) { assert(e.message.includes('BUY_ERROR'), 'Throws BUY_ERROR on zero'); }

  try { buy(-100, BUY_FEE, state); assert(false, 'Negative buy'); }
  catch (e) { assert(e.message.includes('BUY_ERROR'), 'Throws BUY_ERROR on negative'); }

  try { sell(0, SELL_FEE, state); assert(false, 'Zero sell'); }
  catch (e) { assert(e.message.includes('SELL_ERROR'), 'Throws SELL_ERROR on zero'); }

  try { sell(1000, SELL_FEE, state); assert(false, 'Oversell'); }
  catch (e) { assert(e.message.includes('SELL_ERROR'), 'Throws SELL_ERROR on oversell'); }
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 16: Market Metrics ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();
  // Initial: MC = 100 * 0 = 0 (no circulating), FDV = 100 * 1B = 100B
  assertApprox(getMarketCap(state), 0, 'Initial market cap = 0 (no circulating)', 1);
  assertApprox(getFDV(state), 100_000_000_000, 'Initial FDV = Rp 100B', 1);
  assertApprox(getLiquidity(state), 0, 'Initial liquidity = 0', 1);
  assertApprox(getReserveTokens(state), 0, 'Initial reserve = 0', 1);

  const buyResult = buy(10_000_000, BUY_FEE, state);
  const mc = getMarketCap(buyResult.state);
  assert(mc > 0, 'Market cap > 0 after buy');
  const fdv = getFDV(buyResult.state);
  assert(fdv > 100_000_000_000, 'FDV increased after buy');
  assert(getLiquidity(buyResult.state) > 0, 'Liquidity > 0 after buy');

  const pct = getPriceChangePercent(buyResult.state);
  assert(pct > 0, 'Price change positive after buy');
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 17: verifyIntegrity — Liquidity Matches Integral ═══');
// ══════════════════════════════════════════════════════════════
{
  let state = createInitialState();

  // After a single buy, liquidity should match integral(0, circulatingSupply)
  const result = buy(5_000_000, BUY_FEE, state);
  const check = verifyIntegrity(result.state);
  assert(check.valid, 'Integrity valid after single buy');
  console.log(`    → Expected: ${check.expectedLiquidity.toFixed(2)}, Actual: ${check.actualLiquidity.toFixed(2)}, Diff: ${check.diff.toFixed(8)}`);
}
{
  // After buy-sell cycle, liquidity might differ (fees extracted)
  // but circulatingSupply is 0, so integral(0,0) = 0 and liquidity should be ~0
  let state = createInitialState();
  const b = buy(1_000_000, BUY_FEE, state);
  const s = sell(b.tokensReceived, SELL_FEE, b.state);
  assertApprox(s.state.liquidity, 0, 'Liquidity ~0 after full sell', FP_TOLERANCE);
  const check = verifyIntegrity(s.state);
  assert(check.valid, 'Integrity valid after full sell');
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 18: No Arbitrage — Buy-Sell Cycle Never Profits ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();

  // Try various amounts — user should NEVER profit from buy-sell
  const amounts = [100_000, 1_000_000, 10_000_000, 100_000_000];
  for (const amt of amounts) {
    const b = buy(amt, BUY_FEE, state);
    const s = sell(b.tokensReceived, SELL_FEE, b.state);
    assert(
      s.rupiahReceived < amt,
      `No profit: paid Rp ${amt.toLocaleString()}, got Rp ${s.rupiahReceived.toFixed(2)}`
    );
  }
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 19: No Arbitrage — Split vs Bulk Buy ═══');
// ══════════════════════════════════════════════════════════════
{
  // Buying 10M in one go vs 10 × 1M should yield approximately the same tokens.
  // With integral pricing on a continuous curve, splitting doesn't create arbitrage —
  // the total area under the curve is the same regardless of how you partition.
  const state1 = createInitialState();
  const bulk = buy(10_000_000, BUY_FEE, state1);

  let state2 = createInitialState();
  let totalTokensSplit = 0;
  for (let i = 0; i < 10; i++) {
    const r = buy(1_000_000, BUY_FEE, state2);
    totalTokensSplit += r.tokensReceived;
    state2 = r.state;
  }

  // Integral is additive: ∫[0..N] = ∫[0..a] + ∫[a..b] + ... + ∫[m..N]
  // So bulk and split should yield the same tokens (no split arbitrage)
  assertApprox(
    bulk.tokensReceived,
    totalTokensSplit,
    'Bulk buy ≈ split buy (no split arbitrage)',
    0.01
  );
  // Final price should also be the same
  assertApprox(
    bulk.state.price,
    state2.price,
    'Same final price for bulk vs split',
    EPSILON
  );
  console.log(`    → Bulk: ${bulk.tokensReceived.toFixed(6)} tokens`);
  console.log(`    → Split: ${totalTokensSplit.toFixed(6)} tokens`);
  console.log(`    → Diff: ${Math.abs(bulk.tokensReceived - totalTokensSplit).toFixed(10)}`);
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 20: Reserve Accumulation Across Multiple Cycles ═══');
// ══════════════════════════════════════════════════════════════
{
  let state = createInitialState();

  // Cycle 1: buy 1M, sell all
  const b1 = buy(1_000_000, BUY_FEE, state);
  const s1 = sell(b1.tokensReceived, SELL_FEE, b1.state);
  state = s1.state;
  const reserve1 = state.reserveTokens;

  // Cycle 2: buy 2M, sell all
  const b2 = buy(2_000_000, BUY_FEE, state);
  const s2 = sell(b2.tokensReceived, SELL_FEE, b2.state);
  state = s2.state;
  const reserve2 = state.reserveTokens;

  assert(reserve2 > reserve1, 'Reserve accumulates across cycles');
  assert(state.circulatingSupply === 0, 'Circulating back to 0');
  // totalMinted should reflect only new mints (not re-issued reserve tokens)
  console.log(`    → Reserve after cycle 1: ${reserve1.toFixed(2)}`);
  console.log(`    → Reserve after cycle 2: ${reserve2.toFixed(2)}`);
  console.log(`    → Total ever minted: ${state.totalMinted.toFixed(2)}`);
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 21: Large Scale Stress Test (100 buy + 100 sell) ═══');
// ══════════════════════════════════════════════════════════════
{
  let state = createInitialState();
  let totalFeesCollected = 0;

  const allPurchases = [];
  for (let i = 0; i < 100; i++) {
    const result = buy(1_000_000, BUY_FEE, state);
    allPurchases.push(result.tokensReceived);
    totalFeesCollected += result.fee;
    state = result.state;
  }

  console.log(`    → After 100 buys: ${state.circulatingSupply.toFixed(0)} circulating`);
  console.log(`    → Price: Rp ${state.price.toFixed(4)}`);
  console.log(`    → Liquidity: Rp ${state.liquidity.toFixed(2)}`);

  for (let i = allPurchases.length - 1; i >= 0; i--) {
    const result = sell(allPurchases[i], SELL_FEE, state);
    totalFeesCollected += result.fee;
    state = result.state;
  }

  assert(state.liquidity >= -EPSILON, 'Pool solvent after 100 buy + 100 sell');
  assertApprox(state.circulatingSupply, 0, 'All tokens out of circulation', 0.01);
  assert(state.reserveTokens > 0, 'All tokens in reserve (not burned)');
  assert(totalFeesCollected > 0, 'Fees collected throughout');
  console.log(`    → Total fees: Rp ${totalFeesCollected.toFixed(2)}`);
  console.log(`    → Final liquidity: Rp ${state.liquidity.toFixed(6)}`);
  console.log(`    → Reserve tokens: ${state.reserveTokens.toFixed(2)}`);
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 22: State Consistency Invariants ═══');
// ══════════════════════════════════════════════════════════════
{
  let state = createInitialState();

  // After each transaction, check invariants
  const b1 = buy(5_000_000, BUY_FEE, state);
  state = b1.state;
  assert(state.price === getPrice(state.circulatingSupply), 'Price = P(circulatingSupply) after buy');
  assert(state.circulatingSupply + state.reserveTokens <= state.totalMinted + EPSILON, 'circulating + reserve <= totalMinted');

  const s1 = sell(b1.tokensReceived / 2, SELL_FEE, state);
  state = s1.state;
  assert(state.price === getPrice(state.circulatingSupply), 'Price = P(circulatingSupply) after sell');
  assert(state.circulatingSupply + state.reserveTokens <= state.totalMinted + EPSILON, 'circulating + reserve <= totalMinted after sell');
  assert(state.liquidity >= -EPSILON, 'Liquidity non-negative');
  assert(state.reserveTokens >= -EPSILON, 'Reserve non-negative');
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 23: Custom Fee Rates ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();

  // Zero fee buy/sell
  const b = buy(1_000_000, 0, state);
  assertApprox(b.fee, 0, 'Zero fee buy', 0.01);
  assertApprox(b.totalPaid, b.netCost, 'Total paid = net cost with zero fee', 0.01);

  const s = sell(b.tokensReceived, 0, b.state);
  assertApprox(s.fee, 0, 'Zero fee sell', 0.01);
  // With zero fees, sell should return exactly what was paid
  assertApprox(s.rupiahReceived, b.netCost, 'Full refund with zero fees', 1);

  // High fee
  const bHigh = buy(1_000_000, 0.5, state); // 50% fee
  assertApprox(bHigh.fee, 500_000, '50% fee buy', 1);
  assert(bHigh.tokensReceived < b.tokensReceived, 'Higher fee = fewer tokens');
}

// ══════════════════════════════════════════════════════════════
// Summary
// ══════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════');
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
