"use client";

import { Token } from "@/lib/types";
import { shortenAddress, formatNumber, formatUsd } from "@/lib/bonding-curve";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface TradeHistoryProps {
  token: Token;
}

export default function TradeHistory({ token }: TradeHistoryProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <h3 className="text-sm font-semibold text-gray-400">Recent Trades</h3>

      <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
        {token.trades.length === 0 ? (
          <p className="text-center text-sm text-gray-600 py-4">
            No trades yet.
          </p>
        ) : (
          token.trades.map((trade) => (
            <div
              key={trade.id}
              className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-800/30 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                {trade.type === "buy" ? (
                  <ArrowUpRight className="h-4 w-4 text-green-400" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-400" />
                )}
                <div>
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      trade.type === "buy" ? "text-green-400" : "text-red-400"
                    )}
                  >
                    {trade.type === "buy" ? "BUY" : "SELL"}
                  </span>
                  <span className="ml-2 text-xs text-gray-500 font-mono">
                    {shortenAddress(trade.trader)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-300">
                  {formatUsd(trade.amountUsd)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatNumber(trade.amountToken)} POIN &middot;{" "}
                  {timeAgo(trade.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
