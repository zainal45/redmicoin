"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { shortenAddress, formatUsd } from "@/lib/bonding-curve";
import { Wallet, Plus, Zap, LogOut } from "lucide-react";

export default function Navbar() {
  const { wallet, connectWallet, disconnectWallet } = useStore();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Zap className="h-7 w-7 text-green-400" />
              <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-purple-500 bg-clip-text text-transparent">
                RedmiPoin
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/create"
              className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-green-400"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Poin</span>
              <span className="sm:hidden">+</span>
            </Link>

            {wallet.connected ? (
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm">
                    <span className="text-gray-400">Balance: </span>
                    <span className="font-semibold text-green-400">
                      {formatUsd(wallet.balance)}
                    </span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 transition-colors hover:border-red-500 hover:text-red-400"
                >
                  <span className="hidden sm:inline">
                    {shortenAddress(wallet.address || "")}
                  </span>
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="flex items-center gap-2 rounded-lg border border-purple-500 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-400 transition-colors hover:bg-purple-500/20"
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
