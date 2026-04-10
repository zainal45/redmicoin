/**
 * ============================================================
 *  PUMPLIVE — Bonding Curve Engine v2 (NO BURN / Reserve Pool)
 * ============================================================
 *
 *  Linear Bonding Curve:  P(x) = a + b * x
 *
 *  KEY DESIGN:
 *  - Tokens are minted ONLY when users BUY (and no reserve available)
 *  - Tokens are NEVER burned when users SELL
 *  - On SELL, tokens go into a reserve pool
 *  - On BUY, tokens are taken from reserve first, minted only if needed
 *  - Price is determined ONLY by circulating supply (x)
 *
 *  x = circulating_supply (user-held tokens, NOT including reserve)
 *
 *  INTEGRAL PRICING:
 *    Cost(x_old → x_new) = ∫[x_old..x_new] (a + b·x) dx
 *                        = a·Δx + b·Δx·(2·x_old + Δx) / 2
 *
 *  ANTI-MANIPULATION:
 *  - Price NEVER set manually — ONLY from P(x)
 *  - No mint outside BUY
 *  - No burn at all
 *  - Reserve tokens tracked separately
 *  - Liquidity must match integral
 *  - No fake market cap
 *
 * ============================================================
 */

// ── Constants ────────────────────────────────────────────────
const FP_TOLERANCE = 1e-4; // Floating-point tolerance (Rp 0.0001)

// ── Configuration ────────────────────────────────────────────
const CONFIG = {
  MAX_SUPPLY: 1_000_000_000,          // 1 Billion tokens (hard cap)
  INITIAL_PRICE: 100,                  // a = Rp 100 (initial price)
  TARGET_PRICE: 300,                   // target price at max supply
  BUY_FEE_RATE: 0.08,                 // 8% fee on buy
  SELL_FEE_RATE: 0.04,                // 4% fee on sell
};

// b = slope = (target_price - initial_price) / max_supply
CONFIG.SLOPE = (CONFIG.TARGET_PRICE - CONFIG.INITIAL_PRICE) / CONFIG.MAX_SUPPLY; // 2e-7

// ── State (Firebase-ready — serialize this object) ───────────
function createInitialState() {
  return {
    circulatingSupply: 0,   // tokens held by users (x in the formula)
    reserveTokens: 0,        // tokens in the reserve pool (returned from sells)
    totalMinted: 0,           // total tokens ever minted (for audit)
    liquidity: 0,             // total IDR in pool (must match integral)
    adminBalance: 0,          // total fee collected
    price: CONFIG.INITIAL_PRICE, // current spot price P(x)
    userBalances: {},         // { [userId]: { tokens, investedRupiah } }
  };
}

// ── Price Function ───────────────────────────────────────────

/**
 * P(x) = a + b * x
 * Price determined ONLY by circulating supply.
 */
function getPrice(circulatingSupply) {
  return CONFIG.INITIAL_PRICE + CONFIG.SLOPE * circulatingSupply;
}

/**
 * Integral cost: area under curve from x_old to x_old + delta_x
 *
 *   ∫[x_old..x_old+Δx] (a + b·x) dx
 *   = a·Δx + b·Δx·(2·x_old + Δx) / 2
 */
function integralCost(xOld, deltaX) {
  return CONFIG.INITIAL_PRICE * deltaX + (CONFIG.SLOPE * deltaX * (2 * xOld + deltaX)) / 2;
}

/**
 * Solve for Δx given a budget (how many tokens can be bought with `budget` IDR).
 *
 * From:  a·Δx + b/2·Δx² + b·x_old·Δx = budget
 *        (b/2)·Δx² + (a + b·x_old)·Δx - budget = 0
 *
 * Quadratic formula:
 *   Δx = (-B + √(B² + 2·b·budget)) / b
 *   where B = a + b·x_old
 */
function solveTokensForBudget(xOld, budget) {
  if (budget <= 0) return 0;

  const b = CONFIG.SLOPE;
  if (b === 0) {
    return budget / CONFIG.INITIAL_PRICE;
  }

  const B = CONFIG.INITIAL_PRICE + b * xOld;
  const discriminant = B * B + 2 * b * budget;

  if (discriminant < 0) {
    throw new Error('MATH_ERROR: Negative discriminant — invalid state');
  }

  const deltaX = (-B + Math.sqrt(discriminant)) / b;
  return Math.max(0, deltaX);
}

// ── Core Engine Functions ────────────────────────────────────

/**
 * buy(amountIn, feePercent, state)
 *
 * BUY tokens using IDR.
 *
 * Steps:
 *  1. Deduct fee: net = amountIn * (1 - feePercent)
 *  2. Solve delta_x using integral
 *  3. Take tokens from reserve first, mint only if needed
 *  4. Increase circulating supply
 *  5. Update liquidity, price
 *
 * @param {number} amountIn     — IDR amount paid
 * @param {number} feePercent   — fee rate (e.g. 0.08)
 * @param {object} state        — current engine state
 * @returns {{ tokensReceived, fromReserve, newlyMinted, averagePrice, newPrice, fee, netCost, state }}
 */
function buy(amountIn, feePercent, state) {
  if (amountIn <= 0) {
    throw new Error('BUY_ERROR: Amount must be greater than 0');
  }

  const fee = amountIn * feePercent;
  const net = amountIn - fee;

  // Solve: how many tokens can be purchased with `net` IDR
  let deltaX = solveTokensForBudget(state.circulatingSupply, net);

  // Cap: total circulating cannot exceed MAX_SUPPLY
  const maxCanCirculate = CONFIG.MAX_SUPPLY - state.circulatingSupply;
  if (deltaX > maxCanCirculate) {
    deltaX = maxCanCirculate;
  }

  if (deltaX <= 0) {
    throw new Error('BUY_ERROR: No tokens available — max supply reached');
  }

  // Actual cost (may differ if capped by supply)
  const actualCost = integralCost(state.circulatingSupply, deltaX);
  // Refund excess if capped
  const refund = net - actualCost;
  const actualFee = refund > 0
    ? fee - refund * (feePercent / (1 - feePercent))
    : fee;
  const finalFee = Math.max(0, actualFee);

  // Token sourcing: reserve first, then mint
  let fromReserve = 0;
  let newlyMinted = 0;

  if (state.reserveTokens >= deltaX) {
    fromReserve = deltaX;
  } else {
    fromReserve = state.reserveTokens;
    newlyMinted = deltaX - fromReserve;
  }

  const averagePrice = actualCost / deltaX;
  const newCirculating = state.circulatingSupply + deltaX;
  const newPrice = getPrice(newCirculating);

  // Update state
  const newState = {
    ...state,
    circulatingSupply: newCirculating,
    reserveTokens: state.reserveTokens - fromReserve,
    totalMinted: state.totalMinted + newlyMinted,
    liquidity: state.liquidity + actualCost,
    adminBalance: state.adminBalance + finalFee,
    price: newPrice,
  };

  return {
    tokensReceived: deltaX,
    fromReserve,
    newlyMinted,
    averagePrice,
    newPrice,
    fee: finalFee,
    netCost: actualCost,
    totalPaid: actualCost + finalFee,
    refund: refund > 0 ? refund + (fee - finalFee) : 0,
    state: newState,
  };
}

/**
 * sell(tokensToSell, feePercent, state)
 *
 * SELL tokens — NO BURN. Tokens go to reserve pool.
 *
 * Steps:
 *  1. Compute return using reverse integral
 *  2. Apply fee
 *  3. Decrease circulating supply
 *  4. Add tokens to reserve (NOT burned)
 *  5. Update liquidity, price
 *
 * @param {number} tokensToSell — number of tokens to sell
 * @param {number} feePercent   — fee rate (e.g. 0.04)
 * @param {object} state        — current engine state
 * @returns {{ rupiahReceived, grossProceeds, averagePrice, newPrice, fee, state }}
 */
function sell(tokensToSell, feePercent, state) {
  if (tokensToSell <= 0) {
    throw new Error('SELL_ERROR: Token amount must be greater than 0');
  }

  if (tokensToSell > state.circulatingSupply) {
    throw new Error('SELL_ERROR: Cannot sell more than circulating supply');
  }

  const x = state.circulatingSupply;
  const n = tokensToSell;

  // Return = ∫[x-n..x] P(t) dt = a·n + b·n·(2x − n) / 2
  const grossProceeds = CONFIG.INITIAL_PRICE * n + (CONFIG.SLOPE * n * (2 * x - n)) / 2;

  // Validate: liquidity must cover the withdrawal (with FP tolerance)
  if (grossProceeds > state.liquidity + FP_TOLERANCE) {
    throw new Error('SELL_ERROR: Insufficient liquidity — possible state corruption');
  }

  // Cap to actual liquidity to prevent FP underflow
  const cappedGross = Math.min(grossProceeds, state.liquidity);
  const fee = cappedGross * feePercent;
  const userGets = cappedGross - fee;

  const averagePrice = cappedGross / tokensToSell;
  const newCirculating = x - n;
  const newPrice = getPrice(newCirculating);

  // Update state — tokens go to RESERVE, NOT burned
  const newLiquidity = state.liquidity - cappedGross;
  const newState = {
    ...state,
    circulatingSupply: newCirculating,
    reserveTokens: state.reserveTokens + tokensToSell,  // ← NO BURN
    liquidity: Math.max(0, newLiquidity),
    adminBalance: state.adminBalance + fee,
    price: newPrice,
  };

  return {
    rupiahReceived: userGets,
    grossProceeds: cappedGross,
    averagePrice,
    newPrice,
    fee,
    state: newState,
  };
}

// ── Market Metrics (read-only) ───────────────────────────────

/**
 * Market Cap = price × circulatingSupply
 */
function getMarketCap(state) {
  return state.price * state.circulatingSupply;
}

/**
 * FDV (Fully Diluted Valuation) = price × MAX_SUPPLY
 */
function getFDV(state) {
  return state.price * CONFIG.MAX_SUPPLY;
}

/**
 * Liquidity = total IDR in pool (must match integral from 0 to circulatingSupply)
 */
function getLiquidity(state) {
  return state.liquidity;
}

/**
 * Reserve tokens = tokens sitting in the reserve pool (from sells)
 */
function getReserveTokens(state) {
  return state.reserveTokens;
}

// ── Utility / Query Functions ────────────────────────────────

/**
 * Estimate buy (read-only, no state mutation).
 */
function estimateBuy(amountIn, feePercent, state) {
  const net = amountIn * (1 - feePercent);
  const deltaX = solveTokensForBudget(state.circulatingSupply, net);
  const capped = Math.min(deltaX, CONFIG.MAX_SUPPLY - state.circulatingSupply);
  if (capped <= 0) return null;
  const cost = integralCost(state.circulatingSupply, capped);
  const fromReserve = Math.min(state.reserveTokens, capped);
  const newlyMinted = capped - fromReserve;
  return {
    tokensEstimate: capped,
    fromReserve,
    newlyMinted,
    averagePrice: cost / capped,
    priceAfter: getPrice(state.circulatingSupply + capped),
    priceImpact: ((getPrice(state.circulatingSupply + capped) - state.price) / state.price) * 100,
    fee: amountIn * feePercent,
  };
}

/**
 * Estimate sell (read-only, no state mutation).
 */
function estimateSell(tokensToSell, feePercent, state) {
  if (tokensToSell <= 0 || tokensToSell > state.circulatingSupply) return null;
  const x = state.circulatingSupply;
  const n = tokensToSell;
  const gross = CONFIG.INITIAL_PRICE * n + (CONFIG.SLOPE * n * (2 * x - n)) / 2;
  const fee = gross * feePercent;
  return {
    rupiahEstimate: gross - fee,
    grossProceeds: gross,
    averagePrice: gross / n,
    priceAfter: getPrice(x - n),
    priceImpact: ((getPrice(x - n) - state.price) / state.price) * 100,
    fee,
  };
}

/**
 * Verify state integrity: liquidity should match integral from 0 to circulatingSupply.
 * Returns { valid, expectedLiquidity, actualLiquidity, diff }.
 */
function verifyIntegrity(state) {
  const expectedLiquidity = integralCost(0, state.circulatingSupply);
  const diff = Math.abs(state.liquidity - expectedLiquidity);
  return {
    valid: diff <= FP_TOLERANCE,
    expectedLiquidity,
    actualLiquidity: state.liquidity,
    diff,
  };
}

/**
 * Price change percent from initial price.
 */
function getPriceChangePercent(state) {
  return ((state.price - CONFIG.INITIAL_PRICE) / CONFIG.INITIAL_PRICE) * 100;
}

// ── Exports ──────────────────────────────────────────────────
module.exports = {
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
};
