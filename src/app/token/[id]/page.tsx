"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import TradePanel from "@/components/TradePanel";
import PriceChart from "@/components/PriceChart";
import CommentSection from "@/components/CommentSection";
import TradeHistory from "@/components/TradeHistory";
import {
  formatNumber,
  formatUsd,
  shortenAddress,
} from "@/lib/bonding-curve";
import { timeAgo } from "@/lib/utils";
import {
  ArrowLeft,
  Globe,
  AtSign,
  ExternalLink,
  Copy,
  Users,
  TrendingUp,
  Target,
  Coins,
} from "lucide-react";

export default function TokenDetailPage() {
  const params = useParams();
  const tokenId = params.id as string;
  const { tokens } = useStore();
  const token = tokens.find((t) => t.id === tokenId);

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h1 className="text-2xl font-bold text-gray-400">POIN not found</h1>
        <Link
          href="/"
          className="mt-4 flex items-center gap-2 text-green-400 hover:text-green-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(token.creatorAddress);
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-green-400 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to POINs
      </Link>

      {/* Token Header */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 border-gray-700 bg-gray-800">
            <img
              src={token.image}
              alt={token.name}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{token.name}</h1>
              <span className="rounded-full bg-gray-800 px-3 py-0.5 text-sm text-gray-400">
                {token.ticker}
              </span>
            </div>

            <p className="mt-2 text-sm text-gray-400">{token.description}</p>

            <div className="mt-3 flex items-center flex-wrap gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                Created by{" "}
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-1 font-mono text-purple-400 hover:text-purple-300"
                >
                  {shortenAddress(token.creatorAddress)}
                  <Copy className="h-3 w-3" />
                </button>
              </span>
              <span>{timeAgo(token.createdAt)}</span>

              {token.website && (
                <a
                  href={token.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                >
                  <Globe className="h-3 w-3" />
                  Website
                </a>
              )}
              {token.twitter && (
                <a
                  href={token.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                >
                  <AtSign className="h-3 w-3" />
                  Twitter
                </a>
              )}
              {token.telegram && (
                <a
                  href={token.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="h-3 w-3" />
                  Telegram
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-3">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <TrendingUp className="h-3 w-3" />
              Market Cap
            </div>
            <div className="mt-1 text-sm font-bold text-green-400">
              {formatUsd(token.marketCap)}
            </div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-3">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Coins className="h-3 w-3" />
              Price
            </div>
            <div className="mt-1 text-sm font-bold text-white">
              {formatUsd(token.priceInUsd)}
            </div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-3">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Users className="h-3 w-3" />
              Trades
            </div>
            <div className="mt-1 text-sm font-bold text-white">
              {token.trades.length}
            </div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-3">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Target className="h-3 w-3" />
              Supply Sold
            </div>
            <div className="mt-1 text-sm font-bold text-white">
              {formatNumber(token.soldSupply)}
            </div>
          </div>
        </div>

        {/* Bonding Curve Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Bonding Curve Progress</span>
            <span className="font-bold text-green-400">
              {token.bondingCurveProgress.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-300 transition-all duration-500"
              style={{
                width: `${Math.min(100, token.bondingCurveProgress)}%`,
              }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-600">
            POIN price increases as more people buy. Sell anytime on the bonding curve.
          </p>
        </div>
      </div>

      {/* YouTube Live Stream */}
      {token.youtubeUrl && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-400 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            Live Stream
          </h3>
          <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={token.youtubeUrl}
              title={`${token.name} Live Stream`}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Chart and Trade Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PriceChart token={token} />
          <TradeHistory token={token} />
          <CommentSection token={token} />
        </div>
        <div className="space-y-6">
          <TradePanel token={token} />
        </div>
      </div>
    </div>
  );
}
