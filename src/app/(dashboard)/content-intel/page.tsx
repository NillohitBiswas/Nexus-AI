import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLatestScansForUser } from "@/lib/dashboard/scan-data";
import { Lightbulb, TrendingUp, Sparkles, BarChart3, Zap } from "lucide-react";

export default async function ContentIntelPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scans = await getLatestScansForUser(user.id, 1);
  const scan = scans[0];
  const contentGaps =
    (scan?.contentGaps as Array<Record<string, unknown>>) || [];
  const viralHook = scan?.viralHookPrediction as {
    titles?: Array<{ title: string; predictedEM: number }>;
    dominantStyle?: string;
  } | null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white tracking-tight">
          <Lightbulb className="h-7 w-7 text-red-500" />
          Content Intelligence
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Content effectiveness metrics, gap analysis, and viral hook
          predictions powered by AI.
        </p>
      </div>

      {!scan ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-16 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50 text-zinc-600 border border-zinc-200">
            <Lightbulb className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900">No Scan Data</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            Run a scan first to generate content intelligence.
          </p>
        </div>
      ) : (
        <>
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-red-500" />
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  Content Effectiveness
                </span>
              </div>
              <span className="text-4xl font-extrabold text-white">
                {scan.contentEffectivenessScore?.toFixed(1) ?? "—"}
              </span>
              <div className="grid grid-cols-2 gap-4 mt-4 text-xs text-zinc-500 border-t border-zinc-200 pt-3">
                <div>
                  <span className="text-zinc-600 block text-[9px] uppercase font-bold tracking-wider">
                    Transformation
                  </span>
                  <span className="text-zinc-800">
                    {scan.transformationScore?.toFixed(1) ?? "—"}%
                  </span>
                </div>
                <div>
                  <span className="text-zinc-600 block text-[9px] uppercase font-bold tracking-wider">
                    Dominant Transition
                  </span>
                  <span className="text-zinc-800">
                    {scan.dominantTransition ?? "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-800/5 rounded-full blur-xl pointer-events-none" />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                    Viral Potential
                  </span>
                </div>
                <span className="text-xl font-bold text-red-500 uppercase block mt-1">
                  {scan.viralPotentialSignal || "MODERATE"}
                </span>
              </div>
              <div className="text-xs text-zinc-500 mt-3">
                Engagement Score:{" "}
                <strong className="text-white">
                  {scan.threadEngagementScore?.toFixed(2) ?? "—"}
                </strong>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                    Content Gaps Found
                  </span>
                </div>
                <span className="text-4xl font-extrabold text-white">
                  {contentGaps.length}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">
                Topics your audience wants that you haven&apos;t covered yet.
              </p>
            </div>
          </div>

          {/* Content Gaps */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
              Detected Content Gaps
            </h2>

            {contentGaps.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No content gaps extracted.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {contentGaps.slice(0, 8).map((g, i) => {
                  const gapScore = Number(g.gapScore || 0);
                  return (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-zinc-200 bg-white flex justify-between items-center hover:border-red-500/15 transition-all"
                    >
                      <span className="text-xs text-zinc-800 truncate pr-3">
                        {String(g.topic)}
                      </span>
                      <span className="text-[10px] text-red-500 bg-red-500/10 border border-red-100 px-2.5 py-1 rounded font-bold shrink-0">
                        Gap: {gapScore.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Viral Hook Suggestions */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                Viral Hook Suggestions
              </h2>
              {viralHook?.dominantStyle && (
                <span className="text-[10px] text-zinc-500 font-semibold">
                  Style: {viralHook.dominantStyle}
                </span>
              )}
            </div>

            {!viralHook?.titles || viralHook.titles.length === 0 ? (
              <div className="p-6 rounded-2xl border border-zinc-200 bg-zinc-50 text-center">
                <Sparkles className="h-6 w-6 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">
                  Upgrade to Growth/Agency tier to unlock viral hook
                  predictions.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {viralHook.titles.map((t, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-zinc-200 bg-white flex justify-between items-center gap-4 hover:border-red-500/15 transition-all"
                  >
                    <p className="text-sm font-bold text-zinc-900">
                      &quot;{t.title}&quot;
                    </p>
                    <span className="text-xs text-red-500 font-bold tracking-wider shrink-0 bg-red-500/10 border border-red-100 px-2.5 py-1 rounded">
                      EM ×{Number(t.predictedEM || 1.0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
