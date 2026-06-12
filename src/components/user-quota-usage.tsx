import Link from "next/link";
import { BarChart3, ArrowUpRight } from "lucide-react";
import type { TierLimits } from "@/lib/billing/gates";

function formatLimit(n: number): string {
  return n === Infinity ? "Unlimited" : String(n);
}

export function UserQuotaUsage({
  tier,
  limits,
  scanCount,
  replyCount,
}: {
  tier: string;
  limits: TierLimits;
  scanCount: number;
  replyCount: number;
}) {
  const scanLimit = limits.maxScansPerMonth;
  const replyLimit = limits.maxRepliesPerMonth;
  const scansAtLimit = scanLimit !== Infinity && scanCount >= scanLimit;
  const repliesAtLimit = replyLimit !== Infinity && replyCount >= replyLimit;

  const scanPct =
    scanLimit === Infinity ? 0 : Math.min(100, Math.round((scanCount / scanLimit) * 100));
  const replyPct =
    replyLimit === Infinity ? 0 : Math.min(100, Math.round((replyCount / replyLimit) * 100));

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 border border-red-100 text-red-600">
          <BarChart3 className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-bold text-zinc-900">Monthly Usage</h2>
      </div>
      <p className="text-xs text-zinc-500 mb-5 ml-11">
        Quotas for your <span className="font-semibold text-zinc-700">{tier}</span> plan this calendar month.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Scans */}
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
          <div className="flex justify-between items-baseline mb-2">
            <p className="text-xs font-semibold text-zinc-600">Video Scans</p>
            <p className="text-xs font-bold text-zinc-900">
              {scanCount}
              <span className="font-normal text-zinc-400"> / {formatLimit(scanLimit)}</span>
            </p>
          </div>
          <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${
                scanPct >= 90 ? "bg-red-500" : scanPct >= 70 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: scanLimit === Infinity ? "0%" : `${scanPct}%` }}
            />
          </div>
          {scansAtLimit && (
            <Link href="/pricing" className="flex items-center gap-1 text-[10px] font-bold text-red-600 mt-2 hover:underline">
              Upgrade for more scans <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
          {scanLimit === Infinity && (
            <p className="text-[10px] font-semibold text-emerald-600 mt-2">Unlimited scans included</p>
          )}
        </div>
        {/* Replies */}
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
          <div className="flex justify-between items-baseline mb-2">
            <p className="text-xs font-semibold text-zinc-600">Auto-Replies</p>
            <p className="text-xs font-bold text-zinc-900">
              {replyCount}
              <span className="font-normal text-zinc-400"> / {formatLimit(replyLimit)}</span>
            </p>
          </div>
          <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${
                replyPct >= 90 ? "bg-red-500" : replyPct >= 70 ? "bg-amber-500" : "bg-blue-500"
              }`}
              style={{ width: replyLimit === Infinity ? "0%" : `${replyPct}%` }}
            />
          </div>
          {repliesAtLimit && (
            <Link href="/pricing" className="flex items-center gap-1 text-[10px] font-bold text-red-600 mt-2 hover:underline">
              Upgrade for more replies <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
          {replyLimit === Infinity && (
            <p className="text-[10px] font-semibold text-emerald-600 mt-2">Unlimited replies included</p>
          )}
        </div>
      </div>
    </section>
  );
}
