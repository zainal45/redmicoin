"use client";

import { useState } from "react";
import { Token } from "@/lib/types";
import { useStore } from "@/lib/store";
import { shortenAddress } from "@/lib/bonding-curve";
import { timeAgo } from "@/lib/utils";
import { MessageCircle, Send } from "lucide-react";

interface CommentSectionProps {
  token: Token;
}

export default function CommentSection({ token }: CommentSectionProps) {
  const [comment, setComment] = useState("");
  const { wallet, connectWallet, addComment } = useStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    addComment(token.id, comment.trim());
    setComment("");
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-400">
        <MessageCircle className="h-4 w-4" />
        Comments ({token.comments.length})
      </h3>

      <form onSubmit={handleSubmit} className="mt-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              wallet.connected ? "Write a comment..." : "Connect wallet to comment"
            }
            disabled={!wallet.connected}
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-green-500 disabled:opacity-50"
          />
          {wallet.connected ? (
            <button
              type="submit"
              disabled={!comment.trim()}
              className="rounded-lg bg-green-500 px-3 py-2 text-black transition-colors hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={connectWallet}
              className="rounded-lg bg-purple-500 px-3 py-2 text-sm text-white transition-colors hover:bg-purple-400"
            >
              Connect
            </button>
          )}
        </div>
      </form>

      <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
        {token.comments.length === 0 ? (
          <p className="text-center text-sm text-gray-600 py-4">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          token.comments.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-gray-800 bg-gray-800/50 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-purple-400">
                  {shortenAddress(c.author)}
                </span>
                <span className="text-xs text-gray-600">
                  {timeAgo(c.timestamp)}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-300">{c.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
