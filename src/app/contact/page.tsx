import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — Nexus Insights",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 px-6 py-16">
      <div className="mx-auto max-w-xl text-center">
        <Link href="/" className="text-violet-400 text-sm">
          ← Home
        </Link>
        <h1 className="text-3xl font-bold text-white mt-6">Contact</h1>
        <p className="mt-4 text-zinc-400">
          Email us at{" "}
          <a href="mailto:hello@nexusinsights.io" className="text-violet-400">
            hello@nexusinsights.io
          </a>
        </p>
        <p className="mt-2 text-sm text-zinc-500">Support: support@nexusinsights.io</p>
      </div>
    </div>
  );
}
