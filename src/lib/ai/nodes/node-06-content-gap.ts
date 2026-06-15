import { prisma } from "@/lib/db";

// 7 Regex rules for gap detection
const GAP_PATTERNS = [
  /how do you/i,
  /could you make/i,
  /what about/i,
  /wish you showed/i,
  /didn't explain/i,
  /can you do a video/i,
  /missed/i,
  /please do/i,
  /please review/i,
  /review of/i,
  /can you review/i,
  /make a video on/i,
  /would love to see/i,
  /do a comparison/i,
  /cover the/i,
  /can you explain/i,
  /please explain/i,
  /should do a/i,
  /make a tutorial/i,
  /how can i/i,
  /requesting/i,
  /do one for/i,
  /test the/i,
  /compare it with/i,
  /comparison between/i,
  /detailed breakdown/i,
  /want to see/i,
  /waiting for the/i,
  /next video on/i
];

export async function runContentGapExtractor(videoId: string) {
  const comments = await prisma.commentIntelligence.findMany({
    where: { videoId }
  });

  let gapCount = 0;
  let gapIntensitySum = 0;
  const gapTopics: Array<{ topic: string; count: number }> = [];

  for (const c of comments) {
    let isGap = false;
    for (const pattern of GAP_PATTERNS) {
      if (pattern.test(c.rawText)) {
        isGap = true;
        break;
      }
    }

    // Also consider Intent == "QUESTION" as potential gap if not caught by regex
    if (c.intent === "QUESTION" && !isGap) {
      isGap = true;
    }

    if (isGap) {
      gapCount++;
      gapIntensitySum += c.intensity || 0;
      const rawTrimmed = c.rawText.trim().replace(/\n/g, " ");
      const topic = rawTrimmed.length > 80 ? rawTrimmed.slice(0, 77) + "..." : rawTrimmed;
      const existing = gapTopics.find((g) => g.topic === topic);
      if (existing) existing.count++;
      else gapTopics.push({ topic, count: 1 });

      await prisma.commentIntelligence.update({
        where: { id: c.id },
        data: { isContentGap: true },
      });
    }
  }

  const totalComments = comments.length || 1;
  const avgIntensity = gapCount > 0 ? gapIntensitySum / gapCount : 0;
  const gapScore = (gapCount / totalComments) * avgIntensity * 100;

  const contentGaps = gapTopics
    .map(({ topic, count }) => ({
      topic,
      count,
      gapScore: (count / totalComments) * avgIntensity * 100,
    }))
    .sort((a, b) => b.gapScore - a.gapScore);

  const topContentGap = contentGaps[0]?.topic ?? null;

  return {
    gapCount,
    gapScore,
    avgIntensity,
    contentGaps,
    topContentGap,
  };
}
