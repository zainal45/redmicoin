"use client";

import Link from "next/link";
import { Token } from "@/lib/types";
import { formatUsd } from "@/lib/bonding-curve";
import { timeAgo } from "@/lib/utils";
import { TrendingUp, MessageCircle, Clock } from "lucide-react";

interface TokenCardProps {
  token: Token;
}

export default function TokenCard({ token }: TokenCardProps) {
  return (
    <Link href={`/token/${token.id}`}>
      <div className="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 p-4 transition-all hover:border-green-500/50 hover:bg-gray-900/80 hover:shadow-lg hover:shadow-green-500/5">
        <div className="flex gap-3">
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-800">
            <img
              src={token.image}
              alt={token.name}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-bold text-white group-hover:text-green-400 transition-colors">
                {token.name}
              </h3>
              <span className="flex-shrink-0 text-xs text-gray-500">
                {token.ticker}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
              {token.description}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-gray-400">
            <TrendingUp className="h-3 w-3" />
            <span>MC: </span>
            <span className="font-semibold text-green-400">
              {formatUsd(token.marketCap)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-500">
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {token.comments.length}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(token.createdAt)}
            </span>
          </div>
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Curve Progress</span>
            <span className="font-semibold text-green-400">
              {token.bondingCurveProgress.toFixed(1)}%
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
              style={{ width: `${Math.min(100, token.bondingCurveProgress)}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
