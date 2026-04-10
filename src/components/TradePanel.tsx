"use client";

import { useState } from "react";
import { Token } from "@/lib/types";
import { useStore } from "@/lib/store";
import { formatNumber, formatSol, calculateBuyPrice, calculateSellPrice, TOTAL_BONDING_SUPPLY, INITIAL_VIRTUAL_TOKENS } from "@/lib/bonding-curve";
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

  const rawBuyEstimate = mode === "buy" && numAmount > 0
    ? calculateBuyPrice(token.soldSupply, numAmount)
    : null;

  // Cap buy estimate at TOTAL_BONDING_SUPPLY to match store logic
  const buyEstimate = rawBuyEstimate && token.soldSupply + rawBuyEstimate.tokensOut > TOTAL_BONDING_SUPPLY
    ? (() => {
        const cappedTokens = TOTAL_BONDING_SUPPLY - token.soldSupply;
        if (cappedTokens <= 0) return null;
        const K = INITIAL_VIRTUAL_TOKENS * 30;
        const remainingBefore = INITIAL_VIRTUAL_TOKENS - token.soldSupply;
        const virtualSolBefore = K / remainingBefore;
        const remainingAfter = remainingBefore - cappedTokens;
        const virtualSolAfter = K / remainingAfter;
        const actualSolCost = virtualSolAfter - virtualSolBefore;
        return { tokensOut: cappedTokens, avgPrice: actualSolCost / cappedTokens, newPrice: virtualSolAfter / remainingAfter };
      })()
    : rawBuyEstimate;

  const sellEstimate = mode === "sell" && numAmount > 0
    ? calculateSellPrice(token.soldSupply, numAmount)
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
          <span>{mode === "buy" ? "Amount (SOL)" : "Amount (Tokens)"}</span>
          {wallet.connected && mode === "buy" && (
            <span>Balance: {formatSol(wallet.balance)} SOL</span>
          )}
          {wallet.connected && mode === "sell" && (
            <span>Balance: {formatNumber(wallet.tokenBalances[token.id] || 0)} {token.ticker}</span>
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
            {mode === "buy" ? "SOL" : token.ticker}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {quickAmounts.map((qa) => (
            <button
              key={qa}
              onClick={() => setAmount(qa.toString())}
              className="rounded-md bg-gray-800 px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
            >
              {formatNumber(qa)} {mode === "buy" ? "SOL" : ""}
            </button>
          ))}
        </div>
      </div>

      {buyEstimate && (
        <div className="mt-3 rounded-lg bg-gray-800/50 p-3 text-sm">
          <div className="flex items-center justify-between text-gray-400">
            <span>You receive</span>
            <span className="font-semibold text-green-400">
              ~{formatNumber(buyEstimate.tokensOut)} {token.ticker}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-gray-500 text-xs">
            <span>Avg. price</span>
            <span>{formatSol(buyEstimate.avgPrice)} SOL</span>
          </div>
        </div>
      )}

      {sellEstimate && (
        <div className="mt-3 rounded-lg bg-gray-800/50 p-3 text-sm">
          <div className="flex items-center justify-between text-gray-400">
            <span>You receive</span>
            <span className="font-semibold text-red-400">
              ~{formatSol(sellEstimate.solOut)} SOL
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-gray-500 text-xs">
            <span>Avg. price</span>
            <span>{formatSol(sellEstimate.avgPrice)} SOL</span>
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
            {mode === "buy" ? "Buy" : "Sell"} {token.ticker}
          </button>
        )}
      </div>
    </div>
  );
}
