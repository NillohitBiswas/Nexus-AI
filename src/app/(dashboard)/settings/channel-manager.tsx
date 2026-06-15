"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { disconnectChannel } from "@/app/actions/settings";
import { Users, Wifi, WifiOff, Loader2, Trash2 } from "lucide-react";

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface Channel {
  id: string;
  name: string;
  thumbnail: string | null;
  subCount: number;
}

export function ChannelManager({
  initialChannels,
  tier,
  maxLimit,
  limitLabel,
}: {
  initialChannels: Channel[];
  tier: string;
  maxLimit: number;
  limitLabel: string;
}) {
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const channelsConnected = channels.length;
  const slotsLeft = maxLimit === Infinity ? Infinity : maxLimit - channelsConnected;

  const handleDisconnect = async (channelId: string) => {
    if (!confirm("Are you sure you want to disconnect this channel? Your analyzed data and scan history will be preserved.")) {
      return;
    }

    setDeletingId(channelId);
    startTransition(async () => {
      try {
        await disconnectChannel(channelId);
        setChannels((prev) => prev.filter((c) => c.id !== channelId));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        alert(message || "Failed to disconnect channel.");
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Dynamic connected badge at section header equivalent */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
        <span className="text-xs font-semibold text-zinc-500 bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-lg">
          {maxLimit === Infinity ? "Unlimited" : `${channelsConnected} / ${maxLimit}`} connected
        </span>
      </div>

      {/* Tier channel limit info */}
      <div className="flex items-start gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-650">
        <Users className="h-4 w-4 text-zinc-450 mt-0.5 shrink-0" />
        <span>
          Your <strong className="text-zinc-900">{tier}</strong> plan supports{" "}
          <strong className="text-zinc-900">{limitLabel}</strong>.
          {maxLimit !== Infinity && slotsLeft > 0 && (
            <> You have <strong className="text-emerald-700">{slotsLeft} slot{slotsLeft !== 1 ? "s" : ""}</strong> remaining.</>
          )}
          {maxLimit !== Infinity && slotsLeft <= 0 && (
            <> <a href="/pricing" className="text-red-650 font-bold underline">Upgrade your subscription to add more channels.</a></>
          )}
        </span>
      </div>

      {/* Channel list or not-connected state */}
      {channelsConnected === 0 ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center bg-white rounded-xl border border-zinc-150">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200">
            <WifiOff className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-850">Not Connected</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs px-4">
              No YouTube channel is linked to your workspace yet. Connect one to start scanning audience signals.
            </p>
          </div>
          <a
            href="/api/youtube/connect"
            className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]"
          >
            <YoutubeIcon className="h-4 w-4" />
            Connect YouTube Channel
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {channels.map((chan) => (
            <div key={chan.id} className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              {chan.thumbnail ? (
                <img src={chan.thumbnail} alt={chan.name} width={40} height={40} className="h-10 w-10 rounded-full border border-zinc-200 object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 border border-red-100">
                  <YoutubeIcon className="h-5 w-5 text-red-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900 truncate">{chan.name}</span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md shrink-0">
                    <Wifi className="h-2.5 w-2.5" /> Connected
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{chan.subCount.toLocaleString()} subscribers</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <a
                  href="/api/youtube/connect"
                  className="text-xs text-zinc-650 hover:text-zinc-900 font-semibold border border-zinc-200 hover:bg-zinc-100 px-3 py-1.5 rounded-lg transition-all"
                >
                  Reconnect
                </a>
                <Button
                  onClick={() => handleDisconnect(chan.id)}
                  disabled={isPending}
                  variant="ghost"
                  className="h-8 w-8 flex items-center justify-center"
                  title="Disconnect Channel"
                >
                  {deletingId === chan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}

          {/* Add another channel if slots remain */}
          {(maxLimit === Infinity || slotsLeft > 0) && (
            <a
              href="/api/youtube/connect"
              className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-zinc-200 hover:border-red-300 hover:bg-red-50 rounded-xl py-3.5 text-xs font-bold text-zinc-500 hover:text-red-600 transition-all cursor-pointer"
            >
              <YoutubeIcon className="h-4 w-4" />
              Add another channel
            </a>
          )}
        </div>
      )}
    </div>
  );
}
