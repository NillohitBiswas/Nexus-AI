import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isDevAdmin } from "@/lib/dev-tools";
import {
  getAdminUsageSummary,
  getTopScansByGroqTokens,
  listUsersWithUsageInMonth,
  parseMonthParam,
} from "@/lib/usage/admin-queries";
import { Activity, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default async function DevUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; userId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isDevAdmin(user.email)) redirect("/analyzer");

  const params = await searchParams;
  const { year, month } = parseMonthParam(params.month);
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const filterUserId = params.userId || null;

  const [summary, topScans, users] = await Promise.all([
    getAdminUsageSummary({ year, month, userId: filterUserId }),
    getTopScansByGroqTokens({ year, month }),
    listUsersWithUsageInMonth(year, month),
  ]);

  const prevMonth = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const prevKey = `${prevMonth.y}-${String(prevMonth.m).padStart(2, "0")}`;
  const nextKey = `${nextMonth.y}-${String(nextMonth.m).padStart(2, "0")}`;

  const qs = (m: string, uid?: string | null) => {
    const p = new URLSearchParams({ month: m });
    if (uid) p.set("userId", uid);
    return `/dev/usage?${p.toString()}`;
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <Link
          href="/settings"
          className="text-sm text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
          <Activity className="h-7 w-7 text-amber-500" />
          API usage (internal)
        </h1>
        <p className="text-sm text-zinc-500 mt-2">
          Dev admins only — external providers and infrastructure. Not shown to
          customers.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href={qs(prevKey, filterUserId)} className="text-zinc-500 hover:text-zinc-900">
          ← Prev
        </Link>
        <span className="font-semibold text-zinc-900">{monthKey}</span>
        <Link href={qs(nextKey, filterUserId)} className="text-zinc-500 hover:text-zinc-900">
          Next →
        </Link>
        <form method="get" className="ml-auto flex items-center gap-2">
          <input type="hidden" name="month" value={monthKey} />
          <label className="text-zinc-500">User</label>
          <select
            name="userId"
            defaultValue={filterUserId ?? ""}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
          <Button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-700 text-sm hover:bg-zinc-200 transition-colors border border-zinc-200"
            variant="ghost"
          >
            Filter
          </Button>
        </form>
      </div>

      <section className="rounded-2xl border border-zinc-200 overflow-hidden bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-500 text-left border-b border-zinc-200">
            <tr>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Operations</th>
              <th className="px-4 py-3 font-medium">Units</th>
              <th className="px-4 py-3 font-medium">Est. USD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {summary.providers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  No events this month. Run a scan to populate data.
                </td>
              </tr>
            ) : (
              summary.providers.map((p) => (
                <tr key={p.provider} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900">{p.provider}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.operations}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.units.toLocaleString()}</td>
                  <td className="px-4 py-3 text-zinc-600">${p.amount.toFixed(4)}</td>
                </tr>
              ))
            )}
          </tbody>
          {summary.providers.length > 0 && (
            <tfoot className="bg-zinc-50 font-semibold text-zinc-900 border-t border-zinc-200">
              <tr>
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3">{summary.totals.operations}</td>
                <td className="px-4 py-3">{summary.totals.units.toLocaleString()}</td>
                <td className="px-4 py-3">${summary.totals.amount.toFixed(4)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </section>

      {topScans.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 p-6 bg-white shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Top scans by Groq tokens</h2>
          <ul className="space-y-2">
            {topScans.map((s) => (
              <li
                key={s.scanId ?? "unknown"}
                className="flex justify-between gap-4 text-sm border-b border-zinc-100 pb-2 last:border-0 last:pb-0"
              >
                <span className="text-zinc-700 truncate">{s.title}</span>
                <span className="text-zinc-500 shrink-0">
                  {s.tokens.toLocaleString()} tokens · {s.calls} calls
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
