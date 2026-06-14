import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLatestScansForUser } from "@/lib/dashboard/scan-data";
import { Target, TrendingUp, ShieldAlert, Star } from "lucide-react";

export default async function LeadsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scans = await getLatestScansForUser(user.id, 1);
  const scan = scans[0];
  const topLeads =
    (scan?.topLeads as Array<Record<string, unknown>>) || [];
  const objectionMap =
    (scan?.objectionMap as Array<Record<string, unknown>>) || [];
  const proofLibrary =
    (scan?.proofLibrary as Array<Record<string, unknown>>) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white tracking-tight">
          <Target className="h-7 w-7 text-red-500" />
          Leads Engine
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          High-intent buying signals, objection mapping, and social proof
          harvesting from comment intelligence.
        </p>
      </div>

      {!scan ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-16 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50 text-zinc-600 border border-zinc-200">
            <Target className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900">No Scan Data</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            Run a scan first to extract lead intelligence.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-600/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-red-500" />
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  Leads Detected
                </span>
              </div>
              <span className="text-4xl font-extrabold text-white">
                {scan.leadCount ?? topLeads.length}
              </span>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-800/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  Objections Mapped
                </span>
              </div>
              <span className="text-4xl font-extrabold text-white">
                {objectionMap.length}
              </span>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-950/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-red-500" />
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  Proof Harvested
                </span>
              </div>
              <span className="text-4xl font-extrabold text-white">
                {scan.gradeACount ?? 0}
                <span className="text-lg text-zinc-500 font-medium ml-1">
                  Grade A
                </span>
              </span>
            </div>
          </div>

          {/* High-Intent Leads */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                High-Intent Lead Stream
              </h2>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                Growth Engine Active
              </span>
            </div>

            {topLeads.length === 0 ? (
              <div className="p-8 rounded-2xl border border-zinc-200 bg-zinc-50 text-center text-zinc-500 text-sm">
                No high-intent product buying signals extracted. Growth tier
                required for full engine.
              </div>
            ) : (
              <div className="space-y-3">
                {topLeads.map((lead, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-zinc-200 bg-white flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-red-100 transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-500/10 border border-red-100 px-2 py-0.5 rounded">
                          {String(lead.buyingSignal || "Buying Intent")}
                        </span>
                        <span className="text-xs text-zinc-700 font-bold">
                          {String(lead.authorName)}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-800">
                        &quot;{String(lead.rawText)}&quot;
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-center">
                        <span className="text-[10px] text-zinc-500 block">
                          Conv Prob
                        </span>
                        <span className="text-xl font-extrabold text-white">
                          {(
                            Number(lead.pc || lead.conversionProb || 0) * 100
                          ).toFixed(0)}
                          %
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-full border-2 border-red-200 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Objections + Proof Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Objection Map */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                Objection Map
              </h3>
              {objectionMap.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  No buyer hesitation structures identified.
                </p>
              ) : (
                <div className="space-y-2">
                  {objectionMap.map((o, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-red-500/15 transition-all"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-red-500 uppercase tracking-widest">
                          {String(o.archetype)}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Score:{" "}
                          {Number(o.obScore || 0).toFixed(1)}/10
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        {String(o.strategy)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Proof Library */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                Social Proof Library
              </h3>
              {proofLibrary.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  No testimonials harvested yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {proofLibrary.slice(0, 5).map((p, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-red-500/15 transition-all"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-white">
                          Grade {String(p.testimonialGrade || "A")}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Score:{" "}
                          {Number(p.testimonialScore || 0).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700 leading-relaxed truncate">
                        &quot;{String(p.rawText)}&quot;
                      </p>
                      <span className="text-[9px] text-zinc-600 block text-right mt-1">
                        — {String(p.authorName)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
