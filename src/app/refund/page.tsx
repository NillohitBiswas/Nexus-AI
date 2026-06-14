import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy — Nexus Insights",
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-violet-400 text-sm">
          ← Home
        </Link>
        <h1 className="text-3xl font-bold text-white mt-6">Refund Policy</h1>
        <div className="mt-8 space-y-4 text-zinc-400 leading-relaxed">
          <p>
            Monthly subscriptions may be refunded within 7 days of first charge if no more than 2 scans
            were completed. Contact <a href="mailto:support@nexusinsights.io">support@nexusinsights.io</a>.
          </p>
          <p>Indian customers: refunds processed per Razorpay timelines. International: per Dodo Payments policy.</p>
        </div>
      </div>
    </div>
  );
}
