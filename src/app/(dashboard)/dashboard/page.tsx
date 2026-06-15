import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/app/actions/youtube";
import { getUserTier, getLimits } from "@/lib/billing/gates";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  ChevronRight,
  Video,
  ExternalLink,
  ChevronLeft
} from "lucide-react";

// Inline Youtube Icon
const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export const metadata = {
  title: "Dashboard — Nexus Insights",
};

export default async function DashboardPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/login");

  const data = await getDashboardData();
  if ("error" in data) {
    redirect("/login");
  }

  const { user, channels, scans, usage } = data;
  const tier = await getUserTier(user.id);
  const limits = getLimits(tier);

  const scanPct =
    limits.maxScansPerMonth === Infinity
      ? 0
      : Math.min(100, Math.round((usage.scansThisMonth / limits.maxScansPerMonth) * 100));

  const totalCompleted = scans.filter((s) => s.status === "COMPLETE").length;
  const totalFailed = scans.filter((s) => s.status === "FAILED").length;
  const totalRunning = scans.filter((s) => s.status === "PENDING" || s.status === "RUNNING").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2.5">
            <LayoutDashboard className="h-6 w-6 text-red-600" />
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Welcome back! Monitor your workspace resource utilization and report logs.
          </p>
        </div>
        <Link
          href="/analyzer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] self-start sm:self-auto"
        >
          <Video className="h-4 w-4" />
          Analyze New Video
        </Link>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* User Workspace Info */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Account workspace</span>
              <h2 className="text-sm font-bold text-zinc-900 mt-1 truncate">{user.email}</h2>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Current Plan Tier</span>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-lg font-extrabold text-zinc-900 uppercase tracking-tight">{tier}</span>
                <span className="text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full uppercase">
                  {tier}
                </span>
              </div>
            </div>
          </div>
          <div className="border-t border-zinc-100 pt-4 mt-6 flex justify-between items-center">
            <span className="text-xs text-zinc-550">Subscription Status: <strong className="text-emerald-700">Active</strong></span>
            <Link href="/pricing" className="text-xs font-bold text-red-650 hover:underline flex items-center gap-1">
              Pricing & Plans <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Quota Scans Meter */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Video Scans Quota</span>
              <BarChart3 className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-zinc-900">
                {usage.scansThisMonth}
              </span>
              <span className="text-sm text-zinc-550 font-medium">
                {" "} / {usage.maxScansPerMonth === Infinity ? "Unlimited" : `${usage.maxScansPerMonth}`} scans used
              </span>
            </div>
            {usage.maxScansPerMonth !== Infinity && (
              <div className="mt-4 h-2 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50">
                <div
                  className={`h-full rounded-full transition-all ${
                    scanPct >= 90 ? "bg-red-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${scanPct}%` }}
                />
              </div>
            )}
          </div>
          <div className="border-t border-zinc-100 pt-4 mt-6 text-xs text-zinc-550 flex justify-between items-center">
            <span>Quota resets monthly</span>
            {usage.maxScansPerMonth !== Infinity && scanPct >= 80 && (
              <Link href="/pricing" className="text-red-650 font-bold hover:underline">
                Upgrade Plan
              </Link>
            )}
          </div>
        </div>

        {/* YouTube Channel Stats Summary */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">YouTube Integrations</span>
              <YoutubeIcon className="h-4.5 w-4.5 text-zinc-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-zinc-900">
                {channels.length}
              </span>
              <span className="text-sm text-zinc-550 font-medium"> connected channel{channels.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex gap-2.5 mt-4">
              {channels.slice(0, 3).map((c) => (
                <div key={c.id} className="relative group" title={c.name}>
                  {c.thumbnail ? (
                    <img
                      src={c.thumbnail}
                      alt={c.name}
                      className="h-8 w-8 rounded-full border border-zinc-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 border border-red-100 text-red-500">
                      <YoutubeIcon className="h-4 w-4" />
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
              ))}
              {channels.length === 0 && (
                <span className="text-xs text-zinc-500 font-medium flex items-center gap-1.5 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200">
                  No linked channel
                </span>
              )}
            </div>
          </div>
          <div className="border-t border-zinc-100 pt-4 mt-6 flex justify-between items-center">
            <span className="text-xs text-zinc-550">Integrations count</span>
            <Link href="/settings" className="text-xs font-bold text-red-650 hover:underline flex items-center gap-1">
              Manage Channels <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

      </div>

      {/* Main Grid: Activity reports & Channel Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Recent Scans / Scanned Reports (Col span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Recent Activity & Scan Reports</h3>
            <div className="flex gap-2">
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                {totalCompleted} Done
              </span>
              {totalRunning > 0 && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                  {totalRunning} Running
                </span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            {scans.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">
                <Video className="h-10 w-10 mx-auto text-zinc-350 mb-3" />
                <p className="text-sm font-bold text-zinc-800">No scans executed yet</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                  Analyze your first YouTube video comment stream to generate metrics.
                </p>
                <Link
                  href="/analyzer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-red-600 border border-red-100 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-all"
                >
                  Go to Analyzer
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {scans.slice(0, 10).map((sc) => {
                  const isComplete = sc.status === "COMPLETE";
                  const isFailed = sc.status === "FAILED";
                  return (
                    <div key={sc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50 transition-colors">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            isComplete
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : isFailed
                                ? "bg-red-50 text-red-700 border border-red-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                            {sc.status}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium">
                            {sc.completedAt ? new Date(sc.completedAt).toLocaleDateString() : "Pending"}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-zinc-900 truncate pr-4">
                          {sc.video?.title || "YouTube Video Scan"}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                        {sc.video?.url && (
                          <a
                            href={sc.video.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-zinc-400 hover:text-zinc-650 p-1.5 border border-zinc-200 rounded-lg bg-zinc-50"
                            title="Open on YouTube"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <Link
                          href={`/analyzer?scanId=${sc.id}`}
                          className={`text-xs font-semibold px-4 py-2 rounded-xl border transition-all ${
                            isComplete
                              ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                              : "text-zinc-400 border-zinc-200 bg-zinc-50 cursor-not-allowed select-none pointer-events-none"
                          }`}
                        >
                          View Report
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Connected Channels Detail Lists */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active Channels</h3>
          
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            {channels.length === 0 ? (
              <div className="text-center py-6">
                <Users className="h-8 w-8 mx-auto text-zinc-300 mb-2" />
                <p className="text-xs text-zinc-500">No connected channels found in this workspace.</p>
                <Link
                  href="/settings"
                  className="mt-3 text-xs font-bold text-red-650 hover:underline inline-block"
                >
                  Connect Channel →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {channels.map((chan) => (
                  <div key={chan.id} className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                    {chan.thumbnail ? (
                      <img src={chan.thumbnail} alt={chan.name} className="h-9 w-9 rounded-full border border-zinc-200 object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 border border-red-100 text-red-500">
                        <YoutubeIcon className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-zinc-800 truncate block">{chan.name}</span>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">{(chan.subCount || 0).toLocaleString()} subscribers</span>
                    </div>
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Connected" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
