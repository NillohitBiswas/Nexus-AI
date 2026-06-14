import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Nexus Insights",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-violet-400 text-sm">
          ← Home
        </Link>
        <h1 className="text-3xl font-bold text-white mt-6">Terms of Service</h1>
        <div className="mt-8 space-y-4 text-zinc-400 leading-relaxed">
          <p>By using Nexus Insights you agree to use the service lawfully and comply with YouTube API Terms.</p>
          <p>Paid subscriptions renew monthly until cancelled via your payment provider.</p>
          <p>Auto-replies are your responsibility; enable rules only on channels you own.</p>
        </div>
      </div>
    </div>
  );
}
