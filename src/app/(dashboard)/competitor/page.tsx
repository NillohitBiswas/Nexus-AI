import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Zap, TrendingDown, TrendingUp } from "lucide-react";

export default async function CompetitorDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scans = await prisma.scan.findMany({
    where: {
      video: { channel: { userId: user.id } },
      status: "COMPLETE",
    },
    include: { video: { include: { channel: true } } },
    orderBy: { completedAt: "desc" },
    take: 20,
  });

  const competitorScans = scans.filter((s) => {
    if (s.isCompetitorScan) return true;
    const radar = s.competitorRadar as unknown[] | null;
    return Array.isArray(radar) && radar.length > 0;
  });

  type RadarEntry = Record<string, unknown> & { scanTitle: string };
  const allRadar: RadarEntry[] = competitorScans.flatMap((s) => {
    const radar =
      (s.competitorRadar as Array<Record<string, unknown>>) || [];
    return radar.map((r) => ({ ...r, scanTitle: s.video.title }));
  });

  // Aggregate mentions per entity
  const entityMap = new Map<
    string,
    { mentions: number; sentiment: number; count: number; defectors: string[]; scanTitles: string[] }
  >();
  for (const entry of allRadar) {
    const entity = String(entry.entity || "Unknown");
    const existing = entityMap.get(entity) || {
      mentions: 0,
      sentiment: 0,
      count: 0,
      defectors: [],
      scanTitles: [],
    };
    existing.mentions += Number(entry.mentions || 0);
    existing.sentiment += Number(entry.netSentiment || 0);
    existing.count += 1;
    if (Array.isArray(entry.topDefectors)) {
      existing.defectors.push(
        ...entry.topDefectors.map((d: unknown) => String(d))
      );
    }
    if (!existing.scanTitles.includes(entry.scanTitle)) {
      existing.scanTitles.push(entry.scanTitle);
    }
    entityMap.set(entity, existing);
  }

  const aggregated = Array.from(entityMap.entries()).map(
    ([entity, data]) => ({
      entity,
      totalMentions: data.mentions,
      avgSentiment: data.count > 0 ? data.sentiment / data.count : 0,
      defectors: data.defectors.slice(0, 3),
      scanTitles: data.scanTitles,
    })
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white tracking-tight">
          <Zap className="h-7 w-7 text-red-500" />
          Competitor Radar
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Brand mentions, defector tracking, and competitor sentiment analysis
          across your scanned videos.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider block mb-2">
            Total Brands Tracked
          </span>
          <span className="text-4xl font-extrabold text-white">
            {aggregated.length}
          </span>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider block mb-2">
            Total Mentions
          </span>
          <span className="text-4xl font-extrabold text-white">
            {aggregated.reduce((sum, a) => sum + a.totalMentions, 0)}
          </span>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider block mb-2">
            Competitor Scans
          </span>
          <span className="text-4xl font-extrabold text-white">
            {competitorScans.length}
          </span>
        </div>
      </div>

      {/* Instruction */}
      <p className="text-xs text-zinc-500 border border-zinc-200 rounded-xl px-4 py-2.5 bg-white">
        Enable &quot;Competitor scan&quot; in the Analyzer to extract detailed
        brand comparisons from large comment threads.
      </p>

      {/* Competitor Cards */}
      {aggregated.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-16 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50 text-zinc-600 border border-zinc-200">
            <Zap className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900">
            No Competitor Mentions
          </h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            Run a competitor scan on Growth tier to start tracking brand
            mentions.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {aggregated.map((entry, i) => {
            const positive = entry.avgSentiment > 0.05;
            return (
              <div
                key={i}
                className="p-5 rounded-2xl border border-zinc-200 bg-white space-y-3 hover:border-red-100 transition-all"
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-base text-red-500 uppercase tracking-wider">
                    {entry.entity}
                  </h3>
                  <div className="flex gap-2">
                    <span className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-200 px-2.5 py-1 rounded-lg">
                      {entry.totalMentions} mentions
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 ${
                        positive
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
                          : "bg-red-500/10 text-red-400 border border-red-500/15"
                      }`}
                    >
                      {positive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {entry.avgSentiment.toFixed(2)}
                    </span>
                  </div>
                </div>

                {entry.scanTitles.length > 0 && (
                  <p className="text-[10px] text-zinc-500">
                    From:{" "}
                    {entry.scanTitles
                      .slice(0, 2)
                      .map((t) =>
                        t.length > 40 ? t.slice(0, 40) + "…" : t
                      )
                      .join(" · ")}
                  </p>
                )}

                {entry.defectors.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      Defector quotes:
                    </span>
                    <ul className="space-y-1.5 pl-3 list-disc text-xs text-zinc-500">
                      {entry.defectors.map((quote, qi) => (
                        <li key={qi}>
                          &quot;{quote}&quot;
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
