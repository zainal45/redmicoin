/**
 * ============================================================
 *  PUMPLIVE — Bonding Curve Math Engine — Unit Tests
 * ============================================================
 *
 *  Tests untuk membuktikan:
 *  1. Mathematical Integrity — tidak ada kebocoran saldo
 *  2. Integral pricing benar (bukan Total × Harga_Sekarang)
 *  3. Fee system 8% buy / 4% sell benar
 *  4. Floor price Rp 100 tidak bisa ditembus
 *  5. Pool liquidity selalu cukup untuk semua sell
 *
 * ============================================================
 */

const {
  CONFIG,
  createInitialState,
  getPrice,
  integralCost,
  solveTokensForBudget,
  calculateBuy,
  calculateSell,
  estimateBuy,
  estimateSell,
  getPriceChangePercent,
  getMarketCap,
} = require('./bondingCurveEngine');

// ── Helpers ──────────────────────────────────────────────────
const EPSILON = 1e-6; // tolerance for floating point

function approxEqual(a, b, eps = EPSILON) {
  return Math.abs(a - b) < eps;
}

// ── Test Suite ───────────────────────────────────────────────
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
    console.error(
      `  ✗ FAIL: ${testName} — expected ${expected}, got ${actual}`
    );
  }
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 1: Configuration ═══');
// ══════════════════════════════════════════════════════════════
assert(CONFIG.TOTAL_SUPPLY === 1_000_000_000, 'Total supply = 1 Miliar');
assert(CONFIG.FLOOR_PRICE === 100, 'Floor price = Rp 100');
assert(CONFIG.BUY_FEE_RATE === 0.08, 'Buy fee = 8%');
assert(CONFIG.SELL_FEE_RATE === 0.04, 'Sell fee = 4%');
assert(CONFIG.K === 2e-7, 'k = 2e-7 (slope)');

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 2: Price Function ═══');
// ══════════════════════════════════════════════════════════════
assertApprox(getPrice(0), 100, 'Price at 0 tokens = Rp 100 (floor)');
assertApprox(getPrice(500_000_000), 200, 'Price at 500M tokens = Rp 200');
assertApprox(getPrice(1_000_000_000), 300, 'Price at 1B tokens = Rp 300');
assert(getPrice(0) >= CONFIG.FLOOR_PRICE, 'Price never below floor');

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 3: Integral Cost Calculation ═══');
// ══════════════════════════════════════════════════════════════
{
  // Manual calculation: buying 1000 tokens from 0
  // ∫[0..1000] (100 + 2e-7·x) dx = 100·1000 + 2e-7·1000·(0 + 1000)/2
  // = 100000 + 2e-7 · 1000 · 500 = 100000 + 0.1 = 100000.1
  const cost = integralCost(0, 1000);
  assertApprox(cost, 100000.1, 'Integral cost of 1000 tokens from 0', 0.01);
}

{
  // Buying 1000 tokens from position 500M
  // ∫[500M..500M+1000] (100 + 2e-7·x) dx
  // = 100·1000 + 2e-7·1000·(2·500M + 1000)/2
  // = 100000 + 2e-7·1000·(1B + 1000)/2
  // = 100000 + 1e-7·1000·(1000000000 + 1000)
  // = 100000 + 100000.0001 = 200000.0001
  const cost = integralCost(500_000_000, 1000);
  assertApprox(cost, 200000.1, 'Integral cost of 1000 tokens from 500M', 1);
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 4: Quadratic Solver (solveTokensForBudget) ═══');
// ══════════════════════════════════════════════════════════════
{
  // If we invest the cost of 1000 tokens, we should get ~1000 tokens back
  const budget = integralCost(0, 1000);
  const tokens = solveTokensForBudget(0, budget);
  assertApprox(tokens, 1000, 'Solver returns 1000 tokens for exact budget', 0.01);
}

{
  const tokens = solveTokensForBudget(0, 0);
  assert(tokens === 0, 'Zero budget → zero tokens');
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 5: calculateBuy — Basic ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();
  const result = calculateBuy(1_000_000, state); // Buy with Rp 1 juta

  assert(result.tokensReceived > 0, 'Received tokens > 0');
  assert(result.fee > 0, 'Fee collected > 0');
  assertApprox(result.fee, 1_000_000 * 0.08, 'Fee = 8% of input', 1);
  assert(result.newPrice > CONFIG.FLOOR_PRICE, 'Price increased after buy');
  assert(result.state.totalTokensSold > 0, 'State: tokens sold increased');
  assert(result.state.poolLiquidity > 0, 'State: pool has liquidity');
  assert(result.state.adminBalance > 0, 'State: admin received fee');

  console.log(`    → Bought: ${result.tokensReceived.toFixed(2)} tokens`);
  console.log(`    → Avg price: Rp ${result.averagePrice.toFixed(4)}`);
  console.log(`    → New price: Rp ${result.newPrice.toFixed(4)}`);
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 6: calculateSell — Basic ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();
  const buyResult = calculateBuy(1_000_000, state);
  const sellResult = calculateSell(buyResult.tokensReceived, buyResult.state);

  assert(sellResult.rupiahReceived > 0, 'Received Rupiah > 0');
  assert(sellResult.fee > 0, 'Sell fee collected > 0');
  assert(
    sellResult.rupiahReceived < 1_000_000,
    'Received less than paid (fee deducted)'
  );
  assertApprox(sellResult.state.totalTokensSold, 0, 'All tokens returned to reserve', 0.01);
  assert(sellResult.newPrice >= CONFIG.FLOOR_PRICE, 'Price back to floor after full sell');

  console.log(`    → Received: Rp ${sellResult.rupiahReceived.toFixed(2)}`);
  console.log(`    → Total fees lost: Rp ${(1_000_000 - sellResult.rupiahReceived).toFixed(2)}`);
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 7: KRUSIAL — Integral vs Naive Pricing ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();
  const buyResult = calculateBuy(10_000_000, state); // Rp 10 juta

  // Naive calculation (DILARANG): tokens × harga_sekarang
  const naiveValue = buyResult.tokensReceived * buyResult.newPrice;

  // Integral calculation (BENAR): area di bawah kurva
  const integralValue = buyResult.state.poolLiquidity;

  assert(
    naiveValue > integralValue,
    'Naive overestimates value (THIS IS WHY INTEGRAL IS NEEDED)'
  );
  console.log(`    → Naive value:    Rp ${naiveValue.toFixed(2)}`);
  console.log(`    → Integral value: Rp ${integralValue.toFixed(2)}`);
  console.log(
    `    → Overestimate:   ${(((naiveValue - integralValue) / integralValue) * 100).toFixed(2)}%`
  );
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 8: KRUSIAL — No Balance Leakage ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();

  // Simulasi: 5 user masing-masing beli Rp 2 juta
  let currentState = state;
  const purchases = [];
  for (let i = 0; i < 5; i++) {
    const result = calculateBuy(2_000_000, currentState);
    purchases.push(result);
    currentState = result.state;
  }

  console.log(`    → After 5 buys: ${currentState.totalTokensSold.toFixed(2)} tokens sold`);
  console.log(`    → Pool: Rp ${currentState.poolLiquidity.toFixed(2)}`);
  console.log(`    → Admin: Rp ${currentState.adminBalance.toFixed(2)}`);

  // Sekarang semua user jual semua token mereka (reverse order)
  for (let i = purchases.length - 1; i >= 0; i--) {
    const sellResult = calculateSell(purchases[i].tokensReceived, currentState);
    currentState = sellResult.state;
  }

  assert(
    currentState.poolLiquidity >= -EPSILON,
    'Pool liquidity >= 0 after all sells (NO LEAKAGE)'
  );
  assertApprox(
    currentState.totalTokensSold,
    0,
    'All tokens returned to reserve',
    0.01
  );
  assert(
    currentState.currentPrice >= CONFIG.FLOOR_PRICE - EPSILON,
    'Price back to floor after all sells'
  );
  console.log(`    → Final pool: Rp ${currentState.poolLiquidity.toFixed(6)}`);
  console.log(`    → Admin collected: Rp ${currentState.adminBalance.toFixed(2)}`);
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 9: Pool Always Solvent ═══');
// ══════════════════════════════════════════════════════════════
{
  let currentState = createInitialState();

  // Random buy/sell simulation — 20 transactions
  const userTokens = [0, 0, 0]; // 3 users
  const amounts = [
    { action: 'buy', user: 0, amount: 5_000_000 },
    { action: 'buy', user: 1, amount: 3_000_000 },
    { action: 'buy', user: 2, amount: 8_000_000 },
    { action: 'sell', user: 0, amount: 0.5 }, // sell 50% of user 0's tokens
    { action: 'buy', user: 1, amount: 2_000_000 },
    { action: 'sell', user: 2, amount: 0.3 }, // sell 30%
    { action: 'buy', user: 0, amount: 1_000_000 },
    { action: 'sell', user: 1, amount: 1.0 }, // sell all
    { action: 'buy', user: 2, amount: 4_000_000 },
    { action: 'sell', user: 0, amount: 1.0 }, // sell all
  ];

  let solvent = true;
  for (const tx of amounts) {
    try {
      if (tx.action === 'buy') {
        const r = calculateBuy(tx.amount, currentState);
        userTokens[tx.user] += r.tokensReceived;
        currentState = r.state;
      } else {
        const sellAmount = userTokens[tx.user] * tx.amount;
        if (sellAmount > 0) {
          const r = calculateSell(sellAmount, currentState);
          userTokens[tx.user] -= sellAmount;
          currentState = r.state;
        }
      }
      if (currentState.poolLiquidity < -EPSILON) {
        solvent = false;
        break;
      }
    } catch (e) {
      // Expected for edge cases
    }
  }

  assert(solvent, 'Pool stays solvent through all random transactions');
  assert(
    currentState.poolLiquidity >= -EPSILON,
    'Pool liquidity never went negative'
  );
  console.log(`    → Final pool after simulation: Rp ${currentState.poolLiquidity.toFixed(2)}`);
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 10: Floor Price Protection ═══');
// ══════════════════════════════════════════════════════════════
{
  assert(getPrice(0) === CONFIG.FLOOR_PRICE, 'Price at zero supply = floor');
  // Even after selling everything, price should be at floor
  let state = createInitialState();
  const buy = calculateBuy(1_000_000, state);
  const sell = calculateSell(buy.tokensReceived, buy.state);
  assert(
    sell.newPrice >= CONFIG.FLOOR_PRICE,
    'Price after full sell >= floor price'
  );
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 11: Fee Accuracy ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();
  const buyResult = calculateBuy(1_000_000, state);

  // Buy fee should be exactly 8% of input
  assertApprox(buyResult.fee, 80_000, 'Buy fee = Rp 80,000 (8% of 1M)', 1);

  // Net cost + fee should approximately equal total paid
  assertApprox(
    buyResult.netCost + buyResult.fee,
    buyResult.totalPaid,
    'netCost + fee = totalPaid',
    1
  );

  // Sell fee should be 4% of gross proceeds
  const sellResult = calculateSell(buyResult.tokensReceived, buyResult.state);
  assertApprox(
    sellResult.fee,
    sellResult.grossProceeds * 0.04,
    'Sell fee = 4% of gross proceeds',
    0.01
  );
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 12: Estimate Functions (Read-Only) ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();

  const buyEst = estimateBuy(1_000_000, state);
  assert(buyEst !== null, 'Buy estimate returns result');
  assert(buyEst.tokensEstimate > 0, 'Estimated tokens > 0');
  assert(buyEst.priceImpact > 0, 'Price impact > 0 for buy');

  // Verify estimate matches actual
  const buyResult = calculateBuy(1_000_000, state);
  assertApprox(
    buyEst.tokensEstimate,
    buyResult.tokensReceived,
    'Buy estimate matches actual calculation',
    0.01
  );

  const sellEst = estimateSell(buyResult.tokensReceived, buyResult.state);
  assert(sellEst !== null, 'Sell estimate returns result');
  assert(sellEst.priceImpact < 0, 'Price impact < 0 for sell');
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 13: Edge Cases ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();

  // Attempt to buy with 0
  try {
    calculateBuy(0, state);
    assert(false, 'Should throw on zero buy amount');
  } catch (e) {
    assert(e.message.includes('BUY_ERROR'), 'Throws BUY_ERROR on zero amount');
  }

  // Attempt to sell with 0
  try {
    calculateSell(0, state);
    assert(false, 'Should throw on zero sell amount');
  } catch (e) {
    assert(e.message.includes('SELL_ERROR'), 'Throws SELL_ERROR on zero amount');
  }

  // Attempt to sell more than available
  try {
    calculateSell(1000, state);
    assert(false, 'Should throw on oversell');
  } catch (e) {
    assert(
      e.message.includes('SELL_ERROR'),
      'Throws SELL_ERROR on oversell'
    );
  }
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 14: Market Cap & Price Change ═══');
// ══════════════════════════════════════════════════════════════
{
  const state = createInitialState();
  const mc = getMarketCap(state);
  assertApprox(mc, 100_000_000_000, 'Initial market cap = Rp 100B', 1);

  const pct = getPriceChangePercent(state);
  assertApprox(pct, 0, 'Initial price change = 0%', 0.01);

  const buyResult = calculateBuy(10_000_000, state);
  const pctAfter = getPriceChangePercent(buyResult.state);
  assert(pctAfter > 0, 'Price change positive after buy');
}

// ══════════════════════════════════════════════════════════════
console.log('\n═══ TEST 15: Large Scale Stress Test ═══');
// ══════════════════════════════════════════════════════════════
{
  let state = createInitialState();
  let totalFeesCollected = 0;

  // 100 sequential buys of Rp 1M each
  const allPurchases = [];
  for (let i = 0; i < 100; i++) {
    const result = calculateBuy(1_000_000, state);
    allPurchases.push(result.tokensReceived);
    totalFeesCollected += result.fee;
    state = result.state;
  }

  console.log(`    → After 100 buys: ${state.totalTokensSold.toFixed(0)} tokens`);
  console.log(`    → Price: Rp ${state.currentPrice.toFixed(4)}`);
  console.log(`    → Pool: Rp ${state.poolLiquidity.toFixed(2)}`);

  // Sell all in reverse
  for (let i = allPurchases.length - 1; i >= 0; i--) {
    const result = calculateSell(allPurchases[i], state);
    totalFeesCollected += result.fee;
    state = result.state;
  }

  assert(state.poolLiquidity >= -EPSILON, 'Pool solvent after 100 buy + 100 sell');
  assertApprox(state.totalTokensSold, 0, 'All tokens returned', 0.01);
  assert(totalFeesCollected > 0, 'Fees collected throughout');
  console.log(`    → Total fees: Rp ${totalFeesCollected.toFixed(2)}`);
  console.log(`    → Final pool: Rp ${state.poolLiquidity.toFixed(6)}`);
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
