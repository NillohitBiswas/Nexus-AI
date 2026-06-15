import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLatestScansForUser } from "@/lib/dashboard/scan-data";
import { ShieldAlert, AlertTriangle } from "lucide-react";

export default async function ObjectionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scans = await getLatestScansForUser(user.id, 1);
  const scan = scans[0];
  const objectionMap =
    (scan?.objectionMap as Array<Record<string, unknown>>) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-zinc-900 tracking-tight">
          <ShieldAlert className="h-7 w-7 text-red-500" />
          Objection Intelligence
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Buyer hesitation archetypes, severity scores, and counter-strategies
          extracted from audience comments.
        </p>
      </div>

      {!scan ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-16 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50 text-zinc-600 border border-zinc-200">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900">No Scan Data</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            Run a scan first to map audience objections.
          </p>
        </div>
      ) : objectionMap.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-12 text-center space-y-3">
          <p className="text-sm text-zinc-500">
            No objections mapped yet. Growth tier enables full objection
            mapping.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Bar */}
          <div className="flex flex-wrap gap-4 items-center justify-between text-xs text-zinc-500 border border-zinc-200 rounded-xl px-4 py-2.5 bg-white">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              <strong className="text-white">
                {objectionMap.length}
              </strong>{" "}
              objection archetypes identified
            </span>
            <span>
              Avg Severity:{" "}
              <strong className="text-white">
                {(
                  objectionMap.reduce(
                    (sum, o) => sum + Number(o.obScore || 0),
                    0
                  ) / objectionMap.length
                ).toFixed(1)}
              </strong>
              /10
            </span>
          </div>

          {/* Objection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {objectionMap.map((o, i) => {
              const score = Number(o.obScore || 0);
              const severity =
                score >= 7 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW";
              const severityColor =
                severity === "HIGH"
                  ? "text-red-400 bg-red-500/10 border-red-100"
                  : severity === "MEDIUM"
                    ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                    : "text-zinc-500 bg-zinc-500/10 border-zinc-200";

              return (
                <div
                  key={i}
                  className="p-5 rounded-2xl border border-zinc-200 bg-white hover:border-red-100 transition-all group space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-red-500 uppercase tracking-widest">
                      {String(o.archetype)}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${severityColor}`}
                    >
                      {severity} · {score.toFixed(1)}
                    </span>
                  </div>

                  {/* Severity Bar */}
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        severity === "HIGH"
                          ? "bg-red-600"
                          : severity === "MEDIUM"
                            ? "bg-amber-500"
                            : "bg-zinc-600"
                      }`}
                      style={{ width: `${score * 10}%` }}
                    />
                  </div>

                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {String(o.strategy)}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
