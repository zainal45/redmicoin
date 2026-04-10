"use client";

import { create } from "zustand";
import { Token, Comment, Trade, WalletState } from "./types";
import {
  calculatePrice,
  calculateBuyPrice,
  calculateSellPrice,
  calculateMarketCap,
  calculateBondingCurveProgress,
  TOTAL_BONDING_SUPPLY,
  INITIAL_VIRTUAL_TOKENS,
  INITIAL_VIRTUAL_USD,
  CREATOR_BUY_FEE_RATE,
  APP_BUY_FEE_RATE,
  APP_SELL_FEE_RATE,
} from "./bonding-curve";
import { MOCK_TOKENS } from "./mock-data";

interface AppState {
  tokens: Token[];
  wallet: WalletState;
  connectWallet: () => void;
  disconnectWallet: () => void;
  createToken: (token: Omit<Token, "id" | "createdAt" | "marketCap" | "virtualLiquidity" | "totalSupply" | "availableSupply" | "soldSupply" | "priceInUsd" | "bondingCurveProgress" | "comments" | "trades" | "priceHistory">) => string;
  buyToken: (tokenId: string, usdAmount: number) => void;
  sellToken: (tokenId: string, tokenAmount: number) => void;
  addComment: (tokenId: string, content: string) => void;
  getToken: (id: string) => Token | undefined;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateAddress(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";
  let result = "";
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const useStore = create<AppState>((set, get) => ({
  tokens: MOCK_TOKENS,
  wallet: {
    connected: false,
    address: null,
    balance: 100,
    tokenBalances: {},
  },

  connectWallet: () => {
    set({
      wallet: {
        connected: true,
        address: generateAddress(),
        balance: 100,
        tokenBalances: {},
      },
    });
  },

  disconnectWallet: () => {
    set({
      wallet: {
        connected: false,
        address: null,
        balance: 0,
        tokenBalances: {},
      },
    });
  },

  createToken: (tokenData) => {
    const id = generateId();
    const now = Date.now();
    const initialPrice = calculatePrice(0);
    const newToken: Token = {
      ...tokenData,
      id,
      createdAt: now,
      marketCap: calculateMarketCap(0),
      virtualLiquidity: 30,
      totalSupply: 1_000_000_000,
      availableSupply: 800_000_000,
      soldSupply: 0,
      priceInUsd: initialPrice,
      bondingCurveProgress: 0,
      comments: [],
      trades: [],
      priceHistory: [{ timestamp: now, price: initialPrice, volume: 0 }],
    };

    set((state) => ({
      tokens: [newToken, ...state.tokens],
    }));

    return id;
  },

  buyToken: (tokenId, usdAmount) => {
    const state = get();
    if (!state.wallet.connected || usdAmount <= 0 || state.wallet.balance < usdAmount) return;

    set((state) => {
      const tokenIndex = state.tokens.findIndex((t) => t.id === tokenId);
      if (tokenIndex === -1) return state;

      const token = state.tokens[tokenIndex];

      // Calculate fees: 5% creator fee + 1.5% app fee on buy
      const creatorFee = usdAmount * CREATOR_BUY_FEE_RATE;
      const appFee = usdAmount * APP_BUY_FEE_RATE;
      const netUsdForTokens = usdAmount - creatorFee - appFee;

      let { tokensOut, avgPrice, newPrice } = calculateBuyPrice(
        token.soldSupply,
        netUsdForTokens
      );

      // Cap purchase so soldSupply does not exceed TOTAL_BONDING_SUPPLY
      let actualUsdCost = netUsdForTokens;
      if (token.soldSupply + tokensOut > TOTAL_BONDING_SUPPLY) {
        tokensOut = TOTAL_BONDING_SUPPLY - token.soldSupply;
        if (tokensOut <= 0) return state;
        const K = INITIAL_VIRTUAL_TOKENS * INITIAL_VIRTUAL_USD;
        const remainingBefore = INITIAL_VIRTUAL_TOKENS - token.soldSupply;
        const virtualUsdBefore = K / remainingBefore;
        const remainingAfter = remainingBefore - tokensOut;
        const virtualUsdAfter = K / remainingAfter;
        actualUsdCost = virtualUsdAfter - virtualUsdBefore;
        avgPrice = actualUsdCost / tokensOut;
        newPrice = virtualUsdAfter / remainingAfter;
      }

      // Total cost = actual USD for tokens + fees
      const totalCost = actualUsdCost + creatorFee + appFee;

      const newTrade: Trade = {
        id: generateId(),
        type: "buy",
        trader: state.wallet.address || "unknown",
        amountUsd: actualUsdCost,
        amountToken: tokensOut,
        pricePerToken: avgPrice,
        creatorFee,
        appFee,
        timestamp: Date.now(),
      };

      const newSoldSupply = token.soldSupply + tokensOut;
      const updatedToken: Token = {
        ...token,
        soldSupply: newSoldSupply,
        availableSupply: TOTAL_BONDING_SUPPLY - newSoldSupply,
        priceInUsd: newPrice,
        marketCap: calculateMarketCap(newSoldSupply),
        bondingCurveProgress: calculateBondingCurveProgress(newSoldSupply),
        trades: [newTrade, ...token.trades],
        priceHistory: [
          ...token.priceHistory,
          { timestamp: Date.now(), price: newPrice, volume: actualUsdCost },
        ],
      };

      const newTokens = [...state.tokens];
      newTokens[tokenIndex] = updatedToken;

      const currentTokenBalance = state.wallet.tokenBalances[tokenId] || 0;

      return {
        tokens: newTokens,
        wallet: {
          ...state.wallet,
          balance: state.wallet.balance - totalCost,
          tokenBalances: {
            ...state.wallet.tokenBalances,
            [tokenId]: currentTokenBalance + tokensOut,
          },
        },
      };
    });
  },

  sellToken: (tokenId, tokenAmount) => {
    const state = get();
    if (!state.wallet.connected) return;

    const userTokenBalance = state.wallet.tokenBalances[tokenId] || 0;
    if (tokenAmount <= 0 || tokenAmount > userTokenBalance) return;

    set((state) => {
      const tokenIndex = state.tokens.findIndex((t) => t.id === tokenId);
      if (tokenIndex === -1) return state;

      const token = state.tokens[tokenIndex];
      if (tokenAmount > token.soldSupply) return state;

      const { solOut: grossUsdOut, avgPrice, newPrice } = calculateSellPrice(
        token.soldSupply,
        tokenAmount
      );

      // 1.5% app fee on sell
      const appFee = grossUsdOut * APP_SELL_FEE_RATE;
      const netUsdOut = grossUsdOut - appFee;

      const newTrade: Trade = {
        id: generateId(),
        type: "sell",
        trader: state.wallet.address || "unknown",
        amountUsd: grossUsdOut,
        amountToken: tokenAmount,
        pricePerToken: avgPrice,
        creatorFee: 0,
        appFee,
        timestamp: Date.now(),
      };

      const newSoldSupply = Math.max(0, token.soldSupply - tokenAmount);
      const updatedToken: Token = {
        ...token,
        soldSupply: newSoldSupply,
        availableSupply: TOTAL_BONDING_SUPPLY - newSoldSupply,
        priceInUsd: newPrice,
        marketCap: calculateMarketCap(newSoldSupply),
        bondingCurveProgress: calculateBondingCurveProgress(newSoldSupply),
        trades: [newTrade, ...token.trades],
        priceHistory: [
          ...token.priceHistory,
          { timestamp: Date.now(), price: newPrice, volume: grossUsdOut },
        ],
      };

      const newTokens = [...state.tokens];
      newTokens[tokenIndex] = updatedToken;

      const currentTokenBalance = state.wallet.tokenBalances[tokenId] || 0;

      return {
        tokens: newTokens,
        wallet: {
          ...state.wallet,
          balance: state.wallet.balance + netUsdOut,
          tokenBalances: {
            ...state.wallet.tokenBalances,
            [tokenId]: currentTokenBalance - tokenAmount,
          },
        },
      };
    });
  },

  addComment: (tokenId, content) => {
    const state = get();
    if (!state.wallet.connected) return;

    const newComment: Comment = {
      id: generateId(),
      author: state.wallet.address || "unknown",
      content,
      timestamp: Date.now(),
    };

    set((state) => {
      const tokenIndex = state.tokens.findIndex((t) => t.id === tokenId);
      if (tokenIndex === -1) return state;

      const token = state.tokens[tokenIndex];
      const updatedToken: Token = {
        ...token,
        comments: [newComment, ...token.comments],
      };

      const newTokens = [...state.tokens];
      newTokens[tokenIndex] = updatedToken;

      return { tokens: newTokens };
    });
  },

  getToken: (id) => {
    return get().tokens.find((t) => t.id === id);
  },
}));
