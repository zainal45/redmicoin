"use client";

import { useState } from "react";
import { Token } from "@/lib/types";
import { useStore } from "@/lib/store";
import { formatNumber, formatUsd, calculateBuyPrice, calculateSellPrice, TOTAL_BONDING_SUPPLY, INITIAL_VIRTUAL_TOKENS, INITIAL_VIRTUAL_USD, CREATOR_BUY_FEE_RATE, APP_BUY_FEE_RATE, APP_SELL_FEE_RATE } from "@/lib/bonding-curve";
import { cn } from "@/lib/utils";
import { ArrowDownUp, Wallet } from "lucide-react";

interface TradePanelProps {
  token: Token;
}

export default function TradePanel({ token }: TradePanelProps) {
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const { wallet, connectWallet, buyToken, sellToken } = useStore();

  const numAmount = parseFloat(amount) || 0;

  // Buy: deduct fees first, then compute tokens from net USD
  const buyCreatorFee = numAmount * CREATOR_BUY_FEE_RATE;
  const buyAppFee = numAmount * APP_BUY_FEE_RATE;
  const netUsdForTokens = numAmount - buyCreatorFee - buyAppFee;

  const rawBuyEstimate = mode === "buy" && netUsdForTokens > 0
    ? calculateBuyPrice(token.soldSupply, netUsdForTokens)
    : null;

  // Cap buy estimate at TOTAL_BONDING_SUPPLY to match store logic
  const buyEstimate = rawBuyEstimate && token.soldSupply + rawBuyEstimate.tokensOut > TOTAL_BONDING_SUPPLY
    ? (() => {
        const cappedTokens = TOTAL_BONDING_SUPPLY - token.soldSupply;
        if (cappedTokens <= 0) return null;
        const K = INITIAL_VIRTUAL_TOKENS * INITIAL_VIRTUAL_USD;
        const remainingBefore = INITIAL_VIRTUAL_TOKENS - token.soldSupply;
        const virtualUsdBefore = K / remainingBefore;
        const remainingAfter = remainingBefore - cappedTokens;
        const virtualUsdAfter = K / remainingAfter;
        const actualUsdCost = virtualUsdAfter - virtualUsdBefore;
        return { tokensOut: cappedTokens, avgPrice: actualUsdCost / cappedTokens, newPrice: virtualUsdAfter / remainingAfter };
      })()
    : rawBuyEstimate;

  const rawSellEstimate = mode === "sell" && numAmount > 0
    ? calculateSellPrice(token.soldSupply, numAmount)
    : null;

  // Sell: deduct 1.5% app fee from proceeds
  const sellEstimate = rawSellEstimate
    ? { ...rawSellEstimate, solOut: rawSellEstimate.solOut * (1 - APP_SELL_FEE_RATE) }
    : null;

  const handleTrade = () => {
    if (!wallet.connected || numAmount <= 0) return;

    if (mode === "buy") {
      buyToken(token.id, numAmount);
    } else {
      sellToken(token.id, numAmount);
    }
    setAmount("");
  };

  const quickAmounts = mode === "buy"
    ? [0.1, 0.5, 1, 5, 10]
    : [1000, 10000, 100000, 1000000];

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <div className="flex gap-1 rounded-lg bg-gray-800 p-1">
        <button
          onClick={() => { setMode("buy"); setAmount(""); }}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-semibold transition-colors",
            mode === "buy"
              ? "bg-green-500 text-black"
              : "text-gray-400 hover:text-white"
          )}
        >
          Buy
        </button>
        <button
          onClick={() => { setMode("sell"); setAmount(""); }}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-semibold transition-colors",
            mode === "sell"
              ? "bg-red-500 text-white"
              : "text-gray-400 hover:text-white"
          )}
        >
          Sell
        </button>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{mode === "buy" ? "Amount (USD)" : "Amount (POIN)"}</span>
          {wallet.connected && mode === "buy" && (
            <span>Balance: {formatUsd(wallet.balance)}</span>
          )}
          {wallet.connected && mode === "sell" && (
            <span>Balance: {formatNumber(wallet.tokenBalances[token.id] || 0)} POIN</span>
          )}
        </div>
        <div className="mt-1 flex items-center rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-transparent text-lg text-white outline-none placeholder:text-gray-600"
          />
          <span className="ml-2 text-sm text-gray-400">
            {mode === "buy" ? "USD" : "POIN"}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {quickAmounts.map((qa) => (
            <button
              key={qa}
              onClick={() => setAmount(qa.toString())}
              className="rounded-md bg-gray-800 px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
            >
              {mode === "buy" ? formatUsd(qa) : formatNumber(qa)}
            </button>
          ))}
        </div>
      </div>

      {buyEstimate && (
        <div className="mt-3 rounded-lg bg-gray-800/50 p-3 text-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span>You receive</span>
            <span className="font-semibold text-green-400">
              ~{formatNumber(buyEstimate.tokensOut)} POIN
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>Avg. price</span>
            <span>{formatUsd(buyEstimate.avgPrice)}</span>
          </div>
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>Creator fee (5%)</span>
            <span>{formatUsd(buyCreatorFee)}</span>
          </div>
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>App fee (1.5%)</span>
            <span>{formatUsd(buyAppFee)}</span>
          </div>
        </div>
      )}

      {sellEstimate && (
        <div className="mt-3 rounded-lg bg-gray-800/50 p-3 text-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span>You receive</span>
            <span className="font-semibold text-red-400">
              ~{formatUsd(sellEstimate.solOut)}
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>Avg. price</span>
            <span>{formatUsd(sellEstimate.avgPrice)}</span>
          </div>
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>App fee (1.5%)</span>
            <span>{formatUsd((rawSellEstimate?.solOut || 0) * APP_SELL_FEE_RATE)}</span>
          </div>
        </div>
      )}

      <div className="mt-4">
        {!wallet.connected ? (
          <button
            onClick={connectWallet}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-400"
          >
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </button>
        ) : (
          <button
            onClick={handleTrade}
            disabled={numAmount <= 0 || (mode === "buy" && numAmount > wallet.balance) || (mode === "sell" && numAmount > (wallet.tokenBalances[token.id] || 0))}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              mode === "buy"
                ? "bg-green-500 text-black hover:bg-green-400"
                : "bg-red-500 text-white hover:bg-red-400"
            )}
          >
            <ArrowDownUp className="h-4 w-4" />
            {mode === "buy" ? "Buy" : "Sell"} POIN
          </button>
        )}
      </div>
    </div>
  );
}
