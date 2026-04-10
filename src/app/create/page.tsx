"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Wallet, Rocket, ImageIcon, Globe, AtSign, Video } from "lucide-react";

export default function CreateTokenPage() {
  const router = useRouter();
  const { wallet, connectWallet, createToken } = useStore();
  const [formData, setFormData] = useState({
    name: "",
    ticker: "",
    description: "",
    image: "",
    youtubeUrl: "",
    website: "",
    twitter: "",
    telegram: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.connected) return;
    if (!formData.name || !formData.ticker || !formData.description) return;

    const image = formData.image || `https://api.dicebear.com/7.x/identicon/svg?seed=${formData.ticker}`;

    const tokenId = createToken({
      name: formData.name,
      ticker: formData.ticker.toUpperCase(),
      description: formData.description,
      image,
      creatorAddress: wallet.address || "unknown",
      youtubeUrl: formData.youtubeUrl || undefined,
      website: formData.website || undefined,
      twitter: formData.twitter || undefined,
      telegram: formData.telegram || undefined,
    });

    router.push(`/token/${tokenId}`);
  };

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-purple-500 bg-clip-text text-transparent">
          Create a New POIN
        </h1>
        <p className="mt-2 text-gray-400">
          Launch your POIN tied to a live stream. Earn 5% creator fee on every buy.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Rocket className="h-5 w-5 text-green-400" />
            POIN Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                POIN Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. GamerPro Live"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder:text-gray-600 outline-none focus:border-green-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Ticker Symbol *
              </label>
              <input
                type="text"
                value={formData.ticker}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ticker: e.target.value.toUpperCase(),
                  })
                }
                placeholder="e.g. GAMER"
                maxLength={10}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder:text-gray-600 outline-none focus:border-green-500 transition-colors uppercase"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe your POIN and live stream..."
              rows={3}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder:text-gray-600 outline-none focus:border-green-500 transition-colors resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1 flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5" />
              Image URL (optional)
            </label>
            <input
              type="url"
              value={formData.image}
              onChange={(e) =>
                setFormData({ ...formData, image: e.target.value })
              }
              placeholder="https://example.com/image.png"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder:text-gray-600 outline-none focus:border-green-500 transition-colors"
            />
            <p className="text-xs text-gray-600 mt-1">
              Leave empty for auto-generated avatar
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1 flex items-center gap-1">
              <Video className="h-3.5 w-3.5 text-red-500" />
              YouTube Live Stream URL *
            </label>
            <input
              type="url"
              value={formData.youtubeUrl}
              onChange={(e) =>
                setFormData({ ...formData, youtubeUrl: e.target.value })
              }
              placeholder="https://www.youtube.com/embed/..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder:text-gray-600 outline-none focus:border-red-500 transition-colors"
            />
            <p className="text-xs text-gray-600 mt-1">
              Paste your YouTube embed URL. Your live stream will be displayed on the POIN page.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-400" />
            Social Links (optional)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1 flex items-center gap-1">
                <Globe className="h-3 w-3" /> Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-green-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1 flex items-center gap-1">
                <AtSign className="h-3 w-3" /> Twitter
              </label>
              <input
                type="url"
                value={formData.twitter}
                onChange={(e) =>
                  setFormData({ ...formData, twitter: e.target.value })
                }
                placeholder="https://twitter.com/..."
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-green-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Telegram
              </label>
              <input
                type="url"
                value={formData.telegram}
                onChange={(e) =>
                  setFormData({ ...formData, telegram: e.target.value })
                }
                placeholder="https://t.me/..."
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-green-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm">
          <h3 className="font-semibold text-green-400">How it works</h3>
          <ul className="mt-2 space-y-1 text-gray-400">
            <li>
              &bull; Your POIN launches with a bonding curve — price goes up as people buy
            </li>
            <li>
              &bull; You earn 5% creator fee on every buy transaction
            </li>
            <li>
              &bull; Your live stream performance drives the value of your POIN
            </li>
            <li>
              &bull; Total supply: 1,000,000,000 POIN | 800,000,000 on bonding
              curve
            </li>
            <li>
              &bull; App fee: 1.5% on buy and 1.5% on sell
            </li>
          </ul>
        </div>

        {/* Submit */}
        {!wallet.connected ? (
          <button
            type="button"
            onClick={connectWallet}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-400"
          >
            <Wallet className="h-4 w-4" />
            Connect Wallet to Create POIN
          </button>
        ) : (
          <button
            type="submit"
            disabled={
              !formData.name || !formData.ticker || !formData.description
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 py-3 text-sm font-semibold text-black transition-colors hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Rocket className="h-4 w-4" />
            Launch POIN
          </button>
        )}
      </form>
    </div>
  );
}
