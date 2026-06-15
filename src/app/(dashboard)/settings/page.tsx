import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLimits, getMonthlyUsage, getUserTier } from "@/lib/billing/gates";
import { canUseDevTierSwitcher, isDevAdmin } from "@/lib/dev-tools";
import {
  KeyRound,
  ShieldCheck,
  Webhook,
  CreditCard,
  Settings2,
  BarChart3,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import { saveBYOKCredentials, disableBYOK, saveWebhookUrl } from "@/app/actions/settings";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RotateApiTokenButton } from "@/components/rotate-api-token";
import { DevTierSwitcher } from "@/components/dev-tier-switcher";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
// Inline Youtube icon (lucide-react doesn't export it)
const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings — Nexus Insights",
};

// Channel limit per tier
const CHANNEL_LIMITS: Record<string, { max: number; label: string }> = {
  FREE:   { max: 1,        label: "1 channel" },
  CREATOR:{ max: 3,        label: "3 channels" },
  GROWTH: { max: 5,        label: "5 channels" },
  AGENCY: { max: Infinity, label: "Unlimited" },
};
 
import { ChannelManager } from "./channel-manager";
 
function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden ${className}`}>
      {children}
    </section>
  );
}


function SectionHeader({ icon: Icon, title, badge }: { icon: any; title: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-100">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-bold text-zinc-900">{title}</h2>
      </div>
      {badge}
    </div>
  );
}

export default async function SettingsPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: {
      subscriptions: { orderBy: { currentPeriodEnd: "desc" }, take: 1 },
      channels: { take: 10 },
    },
  });

  if (!user) redirect("/login");

  const isAgency  = user.tier === "AGENCY"; // Still used for Developer Tools section
  const sub       = user.subscriptions[0];
  const tier      = await getUserTier(user.id);
  const limits    = getLimits(tier);
  const usage     = await getMonthlyUsage(user.id);
  const showDevTier      = canUseDevTierSwitcher(user.email);
  const showDevUsageLink = isDevAdmin(user.email);

  const channelLimit = CHANNEL_LIMITS[user.tier] ?? CHANNEL_LIMITS["FREE"];
  const connectedChannels = user.channels ?? [];
  const channelsConnected = connectedChannels.length;
  const channelSlotsLeft  = channelLimit.max === Infinity ? Infinity : channelLimit.max - channelsConnected;

  const scanPct =
    limits.maxScansPerMonth === Infinity
      ? 0
      : Math.min(100, Math.round((usage.scanCount / limits.maxScansPerMonth) * 100));
  const replyPct =
    limits.maxRepliesPerMonth === Infinity
      ? 0
      : Math.min(100, Math.round((usage.replyCount / limits.maxRepliesPerMonth) * 100));

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-red-600" />
            Settings
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage your workspace, integrations, and billing.</p>
        </div>
        {showDevUsageLink && (
          <Link href="/dev/usage" className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 border border-amber-200 bg-amber-50 px-3 py-1.5 rounded-lg">
            Dev Dashboard <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* ── Workspace Overview ── */}
      <Section>
        <SectionHeader icon={BarChart3} title="Workspace Overview" />
        <div className="p-6">
          {/* Plan badge */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Current Plan</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-zinc-900">{user.tier}</span>
                <span className="text-xs font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">{user.tier}</span>
              </div>
              {sub && (
                <p className="text-xs text-zinc-500 mt-1">
                  {sub.provider} · renews {sub.currentPeriodEnd.toLocaleDateString()}
                </p>
              )}
            </div>
            <Link
              href="/pricing"
              className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 transition-all px-4 py-2 rounded-xl"
            >
              <CreditCard className="h-4 w-4" />
              {sub ? "Manage Plan" : "Upgrade"}
            </Link>
          </div>

          {/* Usage bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Scans */}
            <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs font-semibold text-zinc-600">Video Scans</span>
                <span className="text-xs text-zinc-500">
                  {usage.scanCount} / {limits.maxScansPerMonth === Infinity ? "∞" : limits.maxScansPerMonth}
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${scanPct >= 90 ? "bg-red-500" : "bg-emerald-500"}`}
                  style={{ width: limits.maxScansPerMonth === Infinity ? "0%" : `${scanPct}%` }}
                />
              </div>
              {limits.maxScansPerMonth !== Infinity && scanPct >= 80 && (
                <p className="text-[10px] text-red-500 font-semibold mt-1.5">
                  {100 - scanPct}% remaining — <Link href="/pricing" className="underline">upgrade</Link>
                </p>
              )}
              {limits.maxScansPerMonth === Infinity && (
                <p className="text-[10px] text-emerald-600 font-semibold mt-1.5">Unlimited scans</p>
              )}
            </div>

            {/* Auto-replies */}
            <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs font-semibold text-zinc-600">Auto-Replies</span>
                <span className="text-xs text-zinc-500">
                  {usage.replyCount} / {limits.maxRepliesPerMonth === Infinity ? "∞" : limits.maxRepliesPerMonth}
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${replyPct >= 90 ? "bg-red-500" : "bg-blue-500"}`}
                  style={{ width: limits.maxRepliesPerMonth === Infinity ? "0%" : `${replyPct}%` }}
                />
              </div>
              {limits.maxRepliesPerMonth === Infinity && (
                <p className="text-[10px] text-emerald-600 font-semibold mt-1.5">Unlimited replies</p>
              )}
            </div>
          </div>
        </div>
        {showDevTier && (
          <div className="px-6 pb-6">
            <DevTierSwitcher currentTier={user.tier} />
          </div>
        )}
      </Section>

      {/* ── Channel Connections ── */}
      <Section>
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-100">
            <YoutubeIcon className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold text-zinc-900">YouTube Channel Connections</h2>
        </div>
        <div className="p-6">
          <ChannelManager
            initialChannels={connectedChannels.map((c) => ({
              id: c.id,
              name: c.name,
              thumbnail: c.thumbnail,
              subCount: c.subCount,
            }))}
            tier={user.tier}
            maxLimit={channelLimit.max}
            limitLabel={channelLimit.label}
          />
        </div>
      </Section>


      {/* ── Developer — Agency Only ── */}
      {isAgency && (
        <Section>
          <SectionHeader icon={Webhook} title="Developer Tools" badge={
            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Agency</span>
          } />
          <div className="p-6 space-y-6">

            {/* API Token */}
            <div>
              <p className="text-sm font-semibold text-zinc-800 mb-1">REST API Key</p>
              <p className="text-xs text-zinc-500 mb-3">
                {user.apiToken
                  ? `Key configured (ends with …${user.apiToken.slice(-6)})`
                  : "No API key generated yet."}
              </p>
              <RotateApiTokenButton />
            </div>

            {/* Webhook */}
            <div>
              <form action={saveWebhookUrl} className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-zinc-800 block mb-1">Outbound Webhook URL</label>
                  <p className="text-xs text-zinc-500 mb-2">Nexus will POST scan results to this endpoint.</p>
                  <Input
                    name="webhookUrl"
                    type="url"
                    defaultValue={user.webhookUrl ?? ""}
                    placeholder="https://your-app.com/webhooks/nexus"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                  />
                </div>
                <Button type="submit" variant="primary" className="px-4 py-2 rounded-xl w-max">
                  Save Webhook
                </Button>
              </form>
            </div>
          </div>
        </Section>
      )}

      {/* ── BYOK ── */}
      <Section>
        <SectionHeader
          icon={KeyRound}
          title="Bring Your Own Key (BYOK)"
          badge={
            user.byokEnabled ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                <ShieldCheck className="h-3.5 w-3.5" /> Active
              </span>
            ) : (
              <span className="text-xs text-zinc-500 bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-lg font-medium">Inactive</span>
            )
          }
        />
        <div className="p-6">
          <div className="space-y-4">
            <p className="text-xs text-zinc-500">Supply your YouTube Data API v3 key. Nexus will use it instead of the shared pool, giving you full quota control.</p>
            <form action={saveBYOKCredentials} className="flex gap-3">
              <Input
                type="password"
                name="youtubeApiKey"
                placeholder="AIza... (YouTube Data API v3 key)"
                className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
              />
              <Button
                type="submit"
                variant="primary"
                className="px-5 py-2.5 rounded-xl"
              >
                {user.byokEnabled ? "Update" : "Enable"}
              </Button>
            </form>
            {user.byokEnabled && (
              <form action={disableBYOK}>
                <Button type="submit" variant="ghost" className="text-xs text-red-500 hover:text-red-600 font-semibold hover:underline flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Remove key and revert to shared pool
                </Button>
              </form>
            )}
          </div>
        </div>
      </Section>

    </div>
  );
}
