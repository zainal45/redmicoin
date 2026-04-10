"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import TokenCard from "@/components/TokenCard";
import KingOfHill from "@/components/KingOfHill";
import { Search, TrendingUp, Clock, BarChart3, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type SortMode = "trending" | "newest" | "marketcap" | "progress";

export default function Home() {
  const { tokens } = useStore();
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("trending");

  const kingOfHill = useMemo(() => {
    return [...tokens].sort((a, b) => b.marketCap - a.marketCap)[0];
  }, [tokens]);

  const filteredTokens = useMemo(() => {
    const filtered = tokens.filter(
      (t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.ticker.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())
    );

    switch (sortMode) {
      case "trending":
        filtered.sort((a, b) => b.trades.length - a.trades.length);
        break;
      case "newest":
        filtered.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "marketcap":
        filtered.sort((a, b) => b.marketCap - a.marketCap);
        break;
      case "progress":
        filtered.sort(
          (a, b) => b.bondingCurveProgress - a.bondingCurveProgress
        );
        break;
    }

    return filtered;
  }, [tokens, search, sortMode]);

  const sortButtons: { mode: SortMode; label: string; icon: React.ReactNode }[] = [
    { mode: "trending", label: "Trending", icon: <Flame className="h-3.5 w-3.5" /> },
    { mode: "newest", label: "Newest", icon: <Clock className="h-3.5 w-3.5" /> },
    { mode: "marketcap", label: "Market Cap", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { mode: "progress", label: "Progress", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-emerald-300 to-purple-500 bg-clip-text text-transparent">
          Launch & Trade Tokens
        </h1>
        <p className="mt-2 text-gray-400 max-w-xl mx-auto">
          Create your own token with a bonding curve. Buy early, sell high. When the market cap reaches the target, it graduates to DEX.
        </p>
      </div>

      {/* King of the Hill */}
      {kingOfHill && <KingOfHill token={kingOfHill} />}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tokens..."
            className="w-full rounded-lg border border-gray-800 bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 outline-none focus:border-green-500 transition-colors"
          />
        </div>

        <div className="flex gap-1 rounded-lg bg-gray-900 border border-gray-800 p-1">
          {sortButtons.map((btn) => (
            <button
              key={btn.mode}
              onClick={() => setSortMode(btn.mode)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                sortMode === btn.mode
                  ? "bg-green-500 text-black"
                  : "text-gray-400 hover:text-white"
              )}
            >
              {btn.icon}
              <span className="hidden sm:inline">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Token Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTokens.map((token) => (
          <TokenCard key={token.id} token={token} />
        ))}
      </div>

      {filteredTokens.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No tokens found</p>
          <p className="text-gray-600 text-sm mt-1">
            Try a different search or create a new token!
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{tokens.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total Tokens</div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {tokens.filter((t) => t.graduated).length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Graduated</div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {tokens.reduce((sum, t) => sum + t.trades.length, 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Total Trades</div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">
            {tokens.reduce((sum, t) => sum + t.comments.length, 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Comments</div>
        </div>
      </div>
    </div>
  );
}
