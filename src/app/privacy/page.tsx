import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Nexus Insights",
  description: "How Nexus Insights collects and uses data.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>Last updated: May 2026</p>
      <p>
        Nexus Insights processes YouTube comment data you authorize, account email from InsForge auth,
        and billing metadata from Razorpay or Dodo Payments. We do not sell personal data.
      </p>
      <p>
        Comment text is analyzed by third-party AI providers (Groq, Google Gemini) under your scan
        requests. OAuth tokens are encrypted at rest.
      </p>
      <p>
        FREE tier scans may be deleted after 14 days. Contact{" "}
        <a href="mailto:privacy@nexusinsights.io">privacy@nexusinsights.io</a> for deletion requests.
      </p>
    </LegalLayout>
  );
}

function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 px-6 py-16">
      <div className="mx-auto max-w-2xl prose prose-invert prose-sm">
        <Link href="/" className="text-violet-400 text-sm no-underline">
          ← Home
        </Link>
        <h1 className="text-3xl font-bold text-white mt-6">{title}</h1>
        <div className="mt-8 space-y-4 text-zinc-400 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
