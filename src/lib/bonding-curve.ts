/**
 * Bonding Curve Implementation
 * 
 * Uses a simplified constant product formula similar to pump.fun:
 * price = k * (soldSupply / totalSupply)^2
 * 
 * As more tokens are bought, the price increases quadratically.
 * When bondingCurveProgress reaches 100%, the token graduates to DEX.
 */

const INITIAL_VIRTUAL_SOL = 30; // Virtual SOL in the pool
const INITIAL_VIRTUAL_TOKENS = 1_000_000_000; // 1B virtual tokens
const GRADUATION_MARKET_CAP = 69_000; // $69k market cap in SOL (~$69k at ~$1/SOL for demo)
const TOTAL_BONDING_SUPPLY = 800_000_000; // 800M tokens available on bonding curve

export function calculatePrice(soldSupply: number): number {
  const virtualSol = INITIAL_VIRTUAL_SOL;
  const remainingTokens = INITIAL_VIRTUAL_TOKENS - soldSupply;
  if (remainingTokens <= 0) return Infinity;
  return virtualSol / remainingTokens;
}

export function calculateBuyPrice(soldSupply: number, solAmount: number): {
  tokensOut: number;
  avgPrice: number;
  newPrice: number;
} {
  const virtualSol = INITIAL_VIRTUAL_SOL;
  const remainingTokens = INITIAL_VIRTUAL_TOKENS - soldSupply;
  const k = virtualSol * remainingTokens;
  
  const newVirtualSol = virtualSol + solAmount;
  const newRemainingTokens = k / newVirtualSol;
  const tokensOut = remainingTokens - newRemainingTokens;
  
  const avgPrice = solAmount / tokensOut;
  const newPrice = newVirtualSol / newRemainingTokens;
  
  return { tokensOut, avgPrice, newPrice };
}

export function calculateSellPrice(soldSupply: number, tokenAmount: number): {
  solOut: number;
  avgPrice: number;
  newPrice: number;
} {
  const virtualSol = INITIAL_VIRTUAL_SOL;
  const remainingTokens = INITIAL_VIRTUAL_TOKENS - soldSupply;
  const k = virtualSol * remainingTokens;
  
  const newRemainingTokens = remainingTokens + tokenAmount;
  const newVirtualSol = k / newRemainingTokens;
  const solOut = virtualSol - newVirtualSol;
  
  const avgPrice = solOut / tokenAmount;
  const newPrice = newVirtualSol / newRemainingTokens;
  
  return { solOut: Math.max(0, solOut), avgPrice, newPrice };
}

export function calculateMarketCap(soldSupply: number): number {
  const price = calculatePrice(soldSupply);
  return price * INITIAL_VIRTUAL_TOKENS;
}

export function calculateBondingCurveProgress(soldSupply: number): number {
  const progress = (soldSupply / TOTAL_BONDING_SUPPLY) * 100;
  return Math.min(100, Math.max(0, progress));
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
  if (num >= 1) return num.toFixed(2);
  if (num >= 0.001) return num.toFixed(4);
  return num.toFixed(8);
}

export function formatSol(num: number): string {
  if (num >= 1000) return formatNumber(num);
  if (num >= 1) return num.toFixed(4);
  return num.toFixed(6);
}

export function shortenAddress(address: string): string {
  return address.slice(0, 4) + '...' + address.slice(-4);
}

export { GRADUATION_MARKET_CAP, TOTAL_BONDING_SUPPLY, INITIAL_VIRTUAL_TOKENS };
