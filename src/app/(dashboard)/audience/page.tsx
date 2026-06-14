import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLatestScansForUser } from "@/lib/dashboard/scan-data";
import { Users, Activity, TrendingUp, Heart } from "lucide-react";

export default async function AudiencePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scans = await getLatestScansForUser(user.id, 1);
  const scan = scans[0];
  const summary = scan?.executiveSummary as Record<string, unknown> | null;
  const personas = (summary?.personas as Array<Record<string, unknown>>) || [];

  const skillData =
    scan?.skillBreakdown && typeof scan.skillBreakdown === "string"
      ? JSON.parse(scan.skillBreakdown)
      : (scan?.skillBreakdown as Record<string, number> | null) || {
          beginner: 0,
          mid: 0,
          expert: 0,
        };
  const skillTotal =
    (skillData.beginner || 0) + (skillData.mid || 0) + (skillData.expert || 0) ||
    100;
  const begPct = Math.round(((skillData.beginner || 0) / skillTotal) * 100);
  const midPct = Math.round(((skillData.mid || 0) / skillTotal) * 100);
  const expPct = Math.round(((skillData.expert || 0) / skillTotal) * 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white tracking-tight">
          <Users className="h-7 w-7 text-red-500" />
          Audience Personas
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Detailed persona segmentation and health metrics derived from comment
          intelligence.
        </p>
      </div>

      {!scan ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-16 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50 text-zinc-600 border border-zinc-200">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900">No Scan Data</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            Run a scan on the Analyzer tab first to generate audience persona
            data.
          </p>
        </div>
      ) : (
        <>
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Health Score */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  Audience Health Index
                </span>
              </div>
              <div className="text-5xl font-extrabold text-red-500 my-2">
                {scan.audienceHealthScore?.toFixed(0) ?? "—"}
                <span className="text-lg text-zinc-500 font-medium">/100</span>
              </div>
              <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-red-600 to-red-800 transition-all"
                  style={{
                    width: `${scan.audienceHealthScore ?? 0}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">
                Derived from returning viewer loyalty and doer action signals.
              </p>
            </div>

            {/* Skill Breakdown */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 col-span-2 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-red-500" />
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  Audience Skill Distribution
                </span>
              </div>

              {/* Beginner */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-700">Beginner / Learner</span>
                  <span className="text-white">{begPct}%</span>
                </div>
                <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-red-600 h-2.5 rounded-full transition-all"
                    style={{ width: `${begPct}%` }}
                  />
                </div>
              </div>

              {/* Mid */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-700">Mid-level Practitioner</span>
                  <span className="text-white">{midPct}%</span>
                </div>
                <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-white h-2.5 rounded-full transition-all"
                    style={{ width: `${midPct}%` }}
                  />
                </div>
              </div>

              {/* Expert */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-700">Expert / Creator</span>
                  <span className="text-white">{expPct}%</span>
                </div>
                <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-red-950 h-2.5 rounded-full transition-all"
                    style={{ width: `${expPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Persona Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                Identified Audience Personas
              </h2>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                {personas.length} segments detected
              </span>
            </div>

            {personas.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No detailed persona segmentations in this report tier.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {personas.map((p, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-2xl border border-zinc-200 bg-white hover:border-red-100 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-zinc-900 text-base group-hover:text-red-500 transition-colors">
                        {String(p.name)}
                      </h3>
                      <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-100">
                        {String(p.percentage)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs text-zinc-500">
                      <div>
                        <span className="text-zinc-600 block uppercase font-bold text-[9px] tracking-wider mb-0.5">
                          Skill Level
                        </span>
                        <span className="text-zinc-800">
                          {String(p.skillSignal || "—")}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-600 block uppercase font-bold text-[9px] tracking-wider mb-0.5">
                          Motivation
                        </span>
                        <span className="text-zinc-800">
                          {String(p.motivationSignal || "—")}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-600 block uppercase font-bold text-[9px] tracking-wider mb-0.5">
                          Context
                        </span>
                        <span className="text-zinc-800">
                          {String(p.contextSignal || "—")}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-600 block uppercase font-bold text-[9px] tracking-wider mb-0.5">
                          Outcome
                        </span>
                        <span className="text-zinc-800">
                          {String(p.outcomeSignal || "—")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
