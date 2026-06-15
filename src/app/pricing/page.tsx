import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles, Check } from "lucide-react";
import { CheckoutButton } from "@/components/checkout-button";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Pricing — Nexus Insights",
  description: "Creator, Growth, and Agency tiers for YouTube comment intelligence.",
  openGraph: {
    title: "Pricing — Nexus Insights",
    description: "14-node intelligence pipeline for YouTube creators.",
  },
};

const PLANS = [
  {
    id: "FREE" as const,
    name: "Free",
    priceUsd: "$0",
    priceInr: "₹0",
    features: ["2 scans/month", "100 comments/scan", "10 auto-replies", "Core classifier"],
    cta: "Get Started",
    href: "/signup",
    highlight: false,
  },
  {
    id: "CREATOR" as const,
    name: "Creator",
    priceUsd: "$39/mo",
    priceInr: "₹3,200/mo",
    features: [
      "Unlimited own-channel scans",
      "500 comments/scan",
      "Delta, Persona, Gaps, Threads",
      "500 auto-replies",
      "5 competitor scans/mo",
    ],
    checkout: true,
    highlight: false,
  },
  {
    id: "GROWTH" as const,
    name: "Growth",
    priceUsd: "$99/mo",
    priceInr: "₹8,200/mo",
    features: [
      "All 14 intelligence nodes",
      "2,000 comments/scan",
      "Leads + Competitor radar",
      "Objections + Proof library",
      "2,000 auto-replies",
    ],
    checkout: true,
    highlight: true,
  },
  {
    id: "AGENCY" as const,
    name: "Agency",
    priceUsd: "$199/mo",
    priceInr: "₹16,500/mo",
    features: [
      "Everything in Growth",
      "Newsroom + BYOK",
      "White-label PDF reports",
      "REST API + webhooks",
      "Unlimited usage",
    ],
    checkout: true,
    highlight: false,
  },
];

export default async function PricingPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-black text-zinc-100 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-30%] left-[20%] w-200 h-200 rounded-full bg-red-600/5 blur-[150px]" />
      </div>

      <header className="border-b border-zinc-900 bg-black/40 backdrop-blur-md px-6 py-4 relative z-10">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-tr from-red-600 to-red-950 border border-red-500/30">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-extrabold tracking-tight text-white">
              NE<span className="text-red-600">X</span>US
            </span>
          </Link>
          <Link href={user ? "/analyzer" : "/login"} className="text-sm text-zinc-400 hover:text-white">
            {user ? "Dashboard" : "Sign in"}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 relative z-10">
        <h1 className="text-4xl font-extrabold text-center mb-4 tracking-tight text-white sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="text-zinc-400 text-center mb-12 max-w-xl mx-auto text-sm sm:text-base">
          India: Razorpay (UPI/cards). International: Dodo Payments. Billed monthly.
        </p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 flex flex-col transition-all duration-350 hover:-translate-y-1 ${
                plan.highlight
                  ? "border-red-500/70 bg-red-950/15 shadow-xl shadow-red-950/20"
                  : "border-zinc-900 bg-zinc-950/40 hover:border-zinc-800"
              }`}
            >
              <h2 className="text-lg font-bold text-white flex justify-between items-center">
                <span>{plan.name}</span>
                {plan.highlight && (
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-red-600 text-white px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                )}
              </h2>
              <p className="text-3xl font-extrabold mt-2 text-white">{plan.priceUsd}</p>
              <p className="text-xs text-zinc-500">{plan.priceInr}</p>
              {user?.tier === plan.id && (
                <span className="mt-2 text-xs text-red-500 font-bold uppercase tracking-wider">Current plan</span>
              )}
              <ul className="mt-6 space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-zinc-300">
                    <Check className={`h-4.5 w-4.5 shrink-0 ${plan.highlight ? 'text-red-500' : 'text-zinc-400'}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {plan.id === "FREE" && "href" in plan ? (
                  <Link
                    href={plan.href}
                    className="block w-full text-center rounded-xl border border-zinc-800 py-3 text-sm font-semibold hover:bg-zinc-900 transition-colors"
                  >
                    {plan.cta}
                  </Link>
                ) : plan.checkout && user ? (
                  <CheckoutButton planId={plan.id} label={`Upgrade to ${plan.name}`} />
                ) : plan.checkout ? (
                  <Link
                    href="/login?redirectTo=/pricing"
                    className="block w-full text-center rounded-xl bg-red-600 hover:bg-red-500 text-white py-3 text-sm font-semibold shadow-lg shadow-red-600/10 transition-colors"
                  >
                    Sign in to subscribe
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
