import { prisma } from "@/lib/db";

export async function runDeltaComparison(scanId: string, videoId: string) {
  const comments = await prisma.commentIntelligence.findMany({
    where: { videoId },
  });

  const themeMap = new Map<string, { sentimentSum: number; count: number }>();
  for (const c of comments) {
    const category = c.category || "Uncategorized";
    const stats = themeMap.get(category) || { sentimentSum: 0, count: 0 };
    stats.sentimentSum += c.sentiment || 0;
    stats.count += 1;
    themeMap.set(category, stats);
  }

  for (const [themeKey, stats] of themeMap.entries()) {
    await prisma.scanTheme.create({
      data: {
        scanId,
        themeKey,
        avgSentiment: stats.sentimentSum / stats.count,
        commentCount: stats.count,
      },
    });
  }

  const previousScans = await prisma.scan.findMany({
    where: {
      videoId,
      id: { not: scanId },
      status: "COMPLETE",
    },
    orderBy: { completedAt: "desc" },
    take: 3,
    include: { themes: true },
  });

  const currentAvgSentiment =
    comments.reduce((acc, c) => acc + (c.sentiment || 0), 0) / (comments.length || 1);

  const sentimentDeltas: Array<{
    themeKey: string;
    velocity: number | null;
    currentSentiment: number;
    previousSentiment: number;
  }> = [];

  let velocity: number | null = null;
  let isEmergency = false;
  const velocities: number[] = [];

  if (previousScans.length > 0 && previousScans[0].completedAt) {
    const previousScan = previousScans[0];
    const previousAvgSentiment =
      previousScan.weightedSentiment || previousScan.rawSentiment || 0;

    const now = new Date();
    const deltaMs = now.getTime() - previousScan.completedAt!.getTime();
    const deltaHours = deltaMs / (1000 * 60 * 60);

    if (deltaHours >= 1) {
      velocity = (currentAvgSentiment - previousAvgSentiment) / deltaHours;
      velocities.push(velocity);
    }

    for (const [themeKey, stats] of themeMap.entries()) {
      const prevTheme = previousScan.themes.find((t) => t.themeKey === themeKey);
      const prevSent = prevTheme?.avgSentiment ?? previousAvgSentiment;
      const curSent = stats.sentimentSum / stats.count;
      let themeVelocity: number | null = null;
      if (deltaHours >= 1) {
        themeVelocity = (curSent - prevSent) / deltaHours;
        velocities.push(themeVelocity);
      }
      sentimentDeltas.push({
        themeKey,
        velocity: themeVelocity,
        currentSentiment: curSent,
        previousSentiment: prevSent,
      });
    }
  } else {
    for (const [themeKey, stats] of themeMap.entries()) {
      sentimentDeltas.push({
        themeKey,
        velocity: null,
        currentSentiment: stats.sentimentSum / stats.count,
        previousSentiment: 0,
      });
    }
  }

  if (previousScans.length >= 3 && velocities.length >= 3) {
    const recentVelocities = velocities.slice(0, 3);
    if (recentVelocities.every((v) => v < -0.05)) {
      isEmergency = true;
    }
  } else if (velocity !== null && velocity < -0.05) {
    isEmergency = true;
  }

  const deltaReport = {
    baselineEstablished: previousScans.length === 0,
    currentAvgSentiment,
    velocity,
    themeCount: themeMap.size,
  };

  return {
    themes: Array.from(themeMap.entries()).map(([k, v]) => ({ theme: k, ...v })),
    velocity,
    isEmergency,
    currentAvgSentiment,
    sentimentDeltas,
    deltaReport,
  };
}
