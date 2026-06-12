import { prisma } from "@/lib/db";

type ThreadPattern = "CONVERGENCE" | "DEBATE" | "ANSWER" | "AMPLIFICATION" | "GHOST";

function classifyThreadPattern(
  depths: number[],
  sentiments: number[]
): ThreadPattern {
  if (depths.length <= 1) return "GHOST";
  const avgSent = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
  const variance =
    sentiments.reduce((acc, s) => acc + Math.pow(s - avgSent, 2), 0) / sentiments.length;
  if (variance > 0.3) return "DEBATE";
  if (avgSent > 0.3) return "CONVERGENCE";
  if (depths.length >= 3) return "AMPLIFICATION";
  return "ANSWER";
}

export async function runThreadConsensusEngine(videoId: string, channelId: string) {
  const comments = await prisma.commentIntelligence.findMany({
    where: { videoId },
  });

  const threads = new Map<string, typeof comments>();

  for (const c of comments) {
    const rootId = c.parentId || c.youtubeCommentId;
    if (!threads.has(rootId)) threads.set(rootId, []);
    threads.get(rootId)!.push(c);
  }

  const depths: number[] = [];
  let ghostThreadCount = 0;
  let superFanResolutions = 0;
  const resolverCounts = new Map<string, number>();

  for (const [rootId, threadComments] of threads.entries()) {
    const depth = threadComments.length;
    depths.push(depth);

    const isGhost = depth === 1;
    if (isGhost) ghostThreadCount++;

    const sentiments = threadComments.map((c) => c.sentiment ?? 0);
    const pattern = classifyThreadPattern(
      threadComments.map(() => 1),
      sentiments
    );

    const rootComment =
      threadComments.find((c) => !c.parentId || c.youtubeCommentId === rootId) ??
      threadComments[0];

    if (rootComment) {
      await prisma.commentIntelligence.update({
        where: { id: rootComment.id },
        data: {
          isGhostThread: isGhost,
          threadDepth: depth,
          threadPattern: pattern,
          isThreadRoot: !rootComment.parentId,
        },
      });

      if (pattern === "ANSWER" && depth >= 2) {
        const resolverId = threadComments[threadComments.length - 1]?.authorChannelId;
        if (resolverId) {
          resolverCounts.set(resolverId, (resolverCounts.get(resolverId) || 0) + 1);
        }
      }
    }
  }

  for (const [authorChannelId, count] of resolverCounts.entries()) {
    if (count >= 2) {
      superFanResolutions++;
      const existing = await prisma.channelCommenter.findFirst({
        where: { channelId, authorChannelId },
      });
      if (existing) {
        await prisma.channelCommenter.update({
          where: { id: existing.id },
          data: { isSuperFan: true },
        });
      } else {
        await prisma.channelCommenter.create({
          data: {
            channelId,
            authorChannelId,
            isSuperFan: true,
            sentimentHistory: [],
          },
        });
      }
    }
  }

  const avgDepth = depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0;
  const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;
  const pct3Plus = depths.length > 0 ? depths.filter((d) => d >= 3).length / depths.length : 0;

  const avgTes = avgDepth * 0.5 + maxDepth * 0.3 + pct3Plus * 0.2;

  let viralPotentialSignal: "HIGH" | "MEDIUM" | "LOW" = "LOW";
  if (avgTes >= 2.5) viralPotentialSignal = "HIGH";
  else if (avgTes >= 1.2) viralPotentialSignal = "MEDIUM";

  return {
    threadCount: threads.size,
    ghostThreadCount,
    avgTes,
    viralPotentialSignal,
    superFanResolutions,
  };
}
