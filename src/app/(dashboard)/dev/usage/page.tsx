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
          className="text-sm text-zinc-500 hover:text-zinc-700 inline-flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="h-7 w-7 text-amber-500" />
          API usage (internal)
        </h1>
        <p className="text-sm text-zinc-500 mt-2">
          Dev admins only — external providers and infrastructure. Not shown to
          customers.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href={qs(prevKey, filterUserId)} className="text-zinc-500 hover:text-white">
          ← Prev
        </Link>
        <span className="font-semibold text-white">{monthKey}</span>
        <Link href={qs(nextKey, filterUserId)} className="text-zinc-500 hover:text-white">
          Next →
        </Link>
        <form method="get" className="ml-auto flex items-center gap-2">
          <input type="hidden" name="month" value={monthKey} />
          <label className="text-zinc-500">User</label>
          <select
            name="userId"
            defaultValue={filterUserId ?? ""}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-white text-sm"
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-800 text-sm hover:bg-zinc-700"
          >
            Filter
          </button>
        </form>
      </div>

      <section className="rounded-2xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/80 text-zinc-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Operations</th>
              <th className="px-4 py-3 font-medium">Units</th>
              <th className="px-4 py-3 font-medium">Est. USD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {summary.providers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  No events this month. Run a scan to populate data.
                </td>
              </tr>
            ) : (
              summary.providers.map((p) => (
                <tr key={p.provider} className="hover:bg-zinc-100">
                  <td className="px-4 py-3 font-medium text-white">{p.provider}</td>
                  <td className="px-4 py-3 text-zinc-700">{p.operations}</td>
                  <td className="px-4 py-3 text-zinc-700">{p.units.toLocaleString()}</td>
                  <td className="px-4 py-3 text-zinc-700">${p.amount.toFixed(4)}</td>
                </tr>
              ))
            )}
          </tbody>
          {summary.providers.length > 0 && (
            <tfoot className="bg-zinc-900/60 font-semibold text-white">
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
        <section className="rounded-2xl border border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top scans by Groq tokens</h2>
          <ul className="space-y-2">
            {topScans.map((s) => (
              <li
                key={s.scanId ?? "unknown"}
                className="flex justify-between gap-4 text-sm border-b border-zinc-200/60 pb-2"
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
