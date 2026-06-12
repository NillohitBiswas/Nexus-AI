"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDevTierAction } from "@/app/actions/dev-tier";
import { AlertTriangle } from "lucide-react";

const TIERS = ["FREE", "CREATOR", "GROWTH", "AGENCY"] as const;

export function DevTierSwitcher({ currentTier }: { currentTier: string }) {
  const router = useRouter();
  const [tier, setTier] = useState(currentTier);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = () => {
    setError(null);
    startTransition(async () => {
      const result = await setDevTierAction(tier);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
      <div className="flex items-start gap-2 text-amber-400/90 text-sm">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p>
          Temporary testing tool — remove before production. Changes your real{" "}
          <code className="text-amber-200">User.tier</code> in the database.
        </p>
      </div>
      <h2 className="text-lg font-semibold text-white">Test tier (dev only)</h2>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          disabled={pending}
          className="rounded-xl border border-zinc-800 bg-black px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500"
        >
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={apply}
          disabled={pending || tier === currentTier}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Applying…" : "Apply tier"}
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </section>
  );
}
