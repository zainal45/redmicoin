/**
 * ============================================================
 *  PUMPLIVE — Bonding Curve Math Engine
 * ============================================================
 *
 *  Linear Bonding Curve:  Price = FloorPrice + (k × TokensSold)
 *
 *  ATURAN KRUSIAL:
 *  - Pembelian & penjualan dihitung dengan metode INTEGRAL
 *    (Average Price / Price Impact), BUKAN Total × Harga_Sekarang.
 *  - Fee Buy  = 8% (masuk saldo Admin)
 *  - Fee Sell = 4% (masuk saldo Admin)
 *  - Harga tidak boleh turun di bawah Floor Price (Rp 100)
 *
 *  Integral formula:
 *    Cost(S → S+n) = ∫[S..S+n] (FloorPrice + k·x) dx
 *                  = FloorPrice·n + k·n·(2S + n) / 2
 *
 * ============================================================
 */

// ── Constants ────────────────────────────────────────────────
const FP_TOLERANCE = 1e-4; // Floating-point tolerance (Rp 0.0001)

// ── Configuration ────────────────────────────────────────────
const CONFIG = {
  TOTAL_SUPPLY: 1_000_000_000,       // 1 Miliar Poin
  FLOOR_PRICE: 100,                   // Rp 100 (harga lantai)
  TARGET_MARKET_CAP: 100_000_000_000, // Rp 100 Triliun target awal
  BUY_FEE_RATE: 0.08,                // 8% fee beli
  SELL_FEE_RATE: 0.04,               // 4% fee jual
  // k = slope of the bonding curve
  // Default: price triples (Rp 300) at full supply
  // 300 = 100 + k * 1_000_000_000  →  k = 2e-7
  K: 2e-7,
};

// ── State (Firebase-ready — serialize this object) ───────────
function createInitialState() {
  return {
    totalTokensSold: 0,
    currentPrice: CONFIG.FLOOR_PRICE,
    poolLiquidity: 0,   // Rupiah cadangan di pool
    adminBalance: 0,    // Total fee terkumpul
    userBalances: {},    // { [userId]: { tokens, investedRupiah } }
  };
}

// ── Price helpers ────────────────────────────────────────────

/**
 * Get the spot price at a given supply level.
 * Price = FloorPrice + k × tokensSold
 */
function getPrice(tokensSold) {
  return CONFIG.FLOOR_PRICE + CONFIG.K * tokensSold;
}

/**
 * Cost to buy `n` tokens starting from `currentSold` tokens in circulation.
 * Uses definite integral (area under the curve):
 *
 *   ∫[S..S+n] (FloorPrice + k·x) dx
 *   = FloorPrice·n  +  k/2 · [(S+n)² − S²]
 *   = FloorPrice·n  +  k·n·(2S + n) / 2
 */
function integralCost(currentSold, tokenCount) {
  const S = currentSold;
  const n = tokenCount;
  return CONFIG.FLOOR_PRICE * n + (CONFIG.K * n * (2 * S + n)) / 2;
}

/**
 * Solve for token count `n` given a Rupiah budget.
 * From:  k/2 · n²  +  (FloorPrice + k·S) · n  −  budget = 0
 * Quadratic:  a·n² + b·n + c = 0
 *   a = k/2
 *   b = FloorPrice + k·S
 *   c = −budget
 *   n = (−b + √(b² + 2·k·budget)) / k
 *
 * Edge case: if k ≈ 0, n = budget / FloorPrice
 */
function solveTokensForBudget(currentSold, budget) {
  if (budget <= 0) return 0;

  const S = currentSold;
  const k = CONFIG.K;

  if (k === 0) {
    return budget / CONFIG.FLOOR_PRICE;
  }

  const b = CONFIG.FLOOR_PRICE + k * S;
  const discriminant = b * b + 2 * k * budget;

  if (discriminant < 0) {
    throw new Error('MATH_ERROR: Negative discriminant — invalid state');
  }

  const n = (-b + Math.sqrt(discriminant)) / k;
  return Math.max(0, n);
}

// ── Core Engine Functions ────────────────────────────────────

/**
 * calculateBuy(rupiahAmount, state)
 *
 * Menghitung berapa token yang didapat dari pembelian dengan sejumlah Rupiah.
 *
 * Flow:
 *  1. Hitung fee (8%) → masuk admin
 *  2. Sisa (92%) digunakan untuk membeli token di kurva
 *  3. Hitung jumlah token menggunakan metode integral (quadratic solve)
 *  4. Validasi: tidak boleh melebihi total supply
 *
 * @param {number} rupiahAmount  — Jumlah Rupiah yang dibayarkan
 * @param {object} state         — State engine saat ini
 * @returns {{ tokensReceived, averagePrice, newPrice, fee, netCost, state }}
 */
function calculateBuy(rupiahAmount, state) {
  if (rupiahAmount <= 0) {
    throw new Error('BUY_ERROR: Jumlah Rupiah harus lebih dari 0');
  }

  const fee = rupiahAmount * CONFIG.BUY_FEE_RATE;
  const netAmount = rupiahAmount - fee; // 92% masuk ke kurva

  // Solve: berapa token yang bisa dibeli dengan netAmount
  let tokensReceived = solveTokensForBudget(state.totalTokensSold, netAmount);

  // Cap: tidak boleh melebihi sisa supply
  const remainingSupply = CONFIG.TOTAL_SUPPLY - state.totalTokensSold;
  if (tokensReceived > remainingSupply) {
    tokensReceived = remainingSupply;
  }

  if (tokensReceived <= 0) {
    throw new Error('BUY_ERROR: Supply habis, tidak ada token tersedia');
  }

  // Hitung cost aktual (jika di-cap oleh supply)
  const actualCost = integralCost(state.totalTokensSold, tokensReceived);
  // Refund jika netAmount > actualCost (karena supply cap)
  const refund = netAmount - actualCost;
  const actualFee = refund > 0 ? fee - refund * (CONFIG.BUY_FEE_RATE / (1 - CONFIG.BUY_FEE_RATE)) : fee;
  const finalFee = Math.max(0, actualFee);

  const averagePrice = actualCost / tokensReceived;
  const newTotalSold = state.totalTokensSold + tokensReceived;
  const newPrice = getPrice(newTotalSold);

  // Update state
  const newState = {
    ...state,
    totalTokensSold: newTotalSold,
    currentPrice: newPrice,
    poolLiquidity: state.poolLiquidity + actualCost,
    adminBalance: state.adminBalance + finalFee,
  };

  return {
    tokensReceived,
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
 * calculateSell(tokenAmount, state)
 *
 * Menghitung berapa Rupiah yang diterima dari penjualan sejumlah token.
 *
 * Flow:
 *  1. Hitung gross proceeds menggunakan integral (area di bawah kurva)
 *     dari (totalTokensSold − tokenAmount) sampai totalTokensSold
 *  2. Hitung fee (4%) → masuk admin
 *  3. Net proceeds (96%) diberikan ke user
 *  4. Token dikembalikan ke reserve (totalTokensSold berkurang)
 *
 * KRUSIAL: Harga MENURUN saat token ditarik dari sirkulasi.
 *          Hasil penjualan < tokenAmount × hargaSekarang.
 *
 * @param {number} tokenAmount  — Jumlah token yang dijual
 * @param {object} state        — State engine saat ini
 * @returns {{ rupiahReceived, grossProceeds, averagePrice, newPrice, fee, state }}
 */
function calculateSell(tokenAmount, state) {
  if (tokenAmount <= 0) {
    throw new Error('SELL_ERROR: Jumlah token harus lebih dari 0');
  }

  if (tokenAmount > state.totalTokensSold) {
    throw new Error('SELL_ERROR: Tidak bisa menjual lebih dari token yang beredar');
  }

  // Integral dari (S - n) ke S  =  integral cost of those tokens
  // Ini = proceeds yang seharusnya user terima (sebelum fee)
  const S = state.totalTokensSold;
  const n = tokenAmount;

  // ∫[S-n..S] (FloorPrice + k·x) dx = FloorPrice·n + k·n·(2S − n) / 2
  const grossProceeds =
    CONFIG.FLOOR_PRICE * n + (CONFIG.K * n * (2 * S - n)) / 2;

  // Validasi: pool harus cukup (dengan toleransi floating-point)
  if (grossProceeds > state.poolLiquidity + FP_TOLERANCE) {
    throw new Error(
      'SELL_ERROR: Pool liquidity tidak mencukupi — kemungkinan kebocoran saldo'
    );
  }

  // Cap gross ke pool liquidity agar tidak negatif akibat FP error
  const cappedGross = Math.min(grossProceeds, state.poolLiquidity);
  const fee = cappedGross * CONFIG.SELL_FEE_RATE;
  const netProceeds = cappedGross - fee;

  const averagePrice = cappedGross / tokenAmount;
  const newTotalSold = S - n;
  const newPrice = getPrice(newTotalSold);

  // Update state — pool berkurang sebesar cappedGross
  const newPoolLiquidity = state.poolLiquidity - cappedGross;
  const newState = {
    ...state,
    totalTokensSold: newTotalSold,
    currentPrice: newPrice,
    // Clamp ke 0 untuk mencegah -0.0000001 akibat FP
    poolLiquidity: Math.max(0, newPoolLiquidity),
    adminBalance: state.adminBalance + fee,
  };

  return {
    rupiahReceived: netProceeds,
    grossProceeds: cappedGross,
    averagePrice,
    newPrice,
    fee,
    state: newState,
  };
}

// ── Utility / Query Functions ────────────────────────────────

/**
 * Hitung estimasi harga rata-rata untuk pembelian sejumlah Rupiah
 * (tanpa mengubah state — read-only).
 */
function estimateBuy(rupiahAmount, state) {
  const netAmount = rupiahAmount * (1 - CONFIG.BUY_FEE_RATE);
  const tokens = solveTokensForBudget(state.totalTokensSold, netAmount);
  const capped = Math.min(tokens, CONFIG.TOTAL_SUPPLY - state.totalTokensSold);
  if (capped <= 0) return null;
  const cost = integralCost(state.totalTokensSold, capped);
  return {
    tokensEstimate: capped,
    averagePrice: cost / capped,
    priceImpact: ((getPrice(state.totalTokensSold + capped) - state.currentPrice) / state.currentPrice) * 100,
    fee: rupiahAmount * CONFIG.BUY_FEE_RATE,
  };
}

/**
 * Hitung estimasi Rupiah yang diterima dari penjualan token
 * (tanpa mengubah state — read-only).
 */
function estimateSell(tokenAmount, state) {
  if (tokenAmount <= 0 || tokenAmount > state.totalTokensSold) return null;
  const S = state.totalTokensSold;
  const n = tokenAmount;
  const gross = CONFIG.FLOOR_PRICE * n + (CONFIG.K * n * (2 * S - n)) / 2;
  const fee = gross * CONFIG.SELL_FEE_RATE;
  return {
    rupiahEstimate: gross - fee,
    grossProceeds: gross,
    averagePrice: gross / n,
    priceImpact: ((getPrice(S - n) - state.currentPrice) / state.currentPrice) * 100,
    fee,
  };
}

/**
 * Hitung persentase kenaikan harga dari floor price (Rp 100).
 */
function getPriceChangePercent(state) {
  return ((state.currentPrice - CONFIG.FLOOR_PRICE) / CONFIG.FLOOR_PRICE) * 100;
}

/**
 * Hitung market cap saat ini = currentPrice × totalSupply
 */
function getMarketCap(state) {
  return state.currentPrice * CONFIG.TOTAL_SUPPLY;
}

// ── Exports ──────────────────────────────────────────────────
module.exports = {
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
};
