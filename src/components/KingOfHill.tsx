"use client";

import Link from "next/link";
import { Token } from "@/lib/types";
import { formatUsd } from "@/lib/bonding-curve";
import { Crown, TrendingUp } from "lucide-react";

interface KingOfHillProps {
  token: Token;
}

export default function KingOfHill({ token }: KingOfHillProps) {
  return (
    <Link href={`/token/${token.id}`}>
      <div className="relative overflow-hidden rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-gray-900 to-purple-500/10 p-6 transition-all hover:border-yellow-500/60 hover:shadow-lg hover:shadow-yellow-500/5">
        <div className="absolute -right-4 -top-4 opacity-10">
          <Crown className="h-24 w-24 text-yellow-500" />
        </div>

        <div className="flex items-center gap-2 text-xs text-yellow-500">
          <Crown className="h-4 w-4" />
          <span className="font-semibold uppercase tracking-wider">
            King of the Hill
          </span>
        </div>

        <div className="mt-3 flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-xl border-2 border-yellow-500/30 bg-gray-800">
            <img
              src={token.image}
              alt={token.name}
              className="h-full w-full object-cover"
            />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">
              {token.name}{" "}
              <span className="text-sm text-gray-500">{token.ticker}</span>
            </h2>
            <div className="mt-1 flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-green-400">
                <TrendingUp className="h-3 w-3" />
                MC: {formatUsd(token.marketCap)}
              </span>
              <span className="text-gray-500">
                Progress: {token.bondingCurveProgress.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-green-400 transition-all"
              style={{
                width: `${Math.min(100, token.bondingCurveProgress)}%`,
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
