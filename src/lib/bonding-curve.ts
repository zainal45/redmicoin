/**
 * Bonding Curve Implementation
 * 
 * Uses a simplified constant product formula:
 * price = k * (soldSupply / totalSupply)^2
 * 
 * As more POIN are bought, the price increases.
 * All prices are in USD.
 */

const INITIAL_VIRTUAL_USD = 30; // Virtual USD in the pool
const INITIAL_VIRTUAL_TOKENS = 1_000_000_000; // 1B virtual tokens
const K = INITIAL_VIRTUAL_USD * INITIAL_VIRTUAL_TOKENS; // Constant product invariant (30B)
const TOTAL_BONDING_SUPPLY = 800_000_000; // 800M POIN available on bonding curve

// Fee constants
export const CREATOR_BUY_FEE_RATE = 0.05; // 5% creator fee on buy
export const APP_BUY_FEE_RATE = 0.015; // 1.5% app fee on buy
export const APP_SELL_FEE_RATE = 0.015; // 1.5% app fee on sell

export function calculatePrice(soldSupply: number): number {
  const remainingTokens = INITIAL_VIRTUAL_TOKENS - soldSupply;
  if (remainingTokens <= 0) return Infinity;
  const currentVirtualSol = K / remainingTokens;
  return currentVirtualSol / remainingTokens;
}

export function calculateBuyPrice(soldSupply: number, solAmount: number): {
  tokensOut: number;
  avgPrice: number;
  newPrice: number;
} {
  const remainingTokens = INITIAL_VIRTUAL_TOKENS - soldSupply;
  const currentVirtualSol = K / remainingTokens;
  
  const newVirtualSol = currentVirtualSol + solAmount;
  const newRemainingTokens = K / newVirtualSol;
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
  const remainingTokens = INITIAL_VIRTUAL_TOKENS - soldSupply;
  const currentVirtualSol = K / remainingTokens;
  
  const newRemainingTokens = remainingTokens + tokenAmount;
  const newVirtualSol = K / newRemainingTokens;
  const solOut = currentVirtualSol - newVirtualSol;
  
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

export function formatUsd(num: number): string {
  if (num >= 1_000_000) return '$' + (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return '$' + (num / 1_000).toFixed(2) + 'K';
  if (num >= 1) return '$' + num.toFixed(2);
  if (num >= 0.01) return '$' + num.toFixed(4);
  return '$' + num.toFixed(6);
}

export function shortenAddress(address: string): string {
  return address.slice(0, 4) + '...' + address.slice(-4);
}

export { TOTAL_BONDING_SUPPLY, INITIAL_VIRTUAL_TOKENS, INITIAL_VIRTUAL_USD };
