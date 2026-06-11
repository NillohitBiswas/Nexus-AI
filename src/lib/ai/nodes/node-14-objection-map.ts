import { prisma } from "@/lib/db";

const OBJECTION_PATTERNS: Record<string, RegExp> = {
  PRICE: /\b(too expensive|can't afford|pricey|costs too much|not worth)\b/i,
  FEATURE: /\b(missing|doesn't have|need feature|lacks|without)\b/i,
  COMPLEXITY: /\b(too complicated|confusing|hard to use|overwhelming)\b/i,
  TRUST: /\b(scam|sketchy|don't trust|fake|suspicious)\b/i,
  TIMING: /\b(not now|later|maybe next|wait until)\b/i,
};

const STRATEGIES: Record<string, string> = {
  PRICE: "Lead with ROI framing and tier comparison; offer trial or payment plan.",
  FEATURE: "Acknowledge gap, share roadmap timeline, offer workaround.",
  COMPLEXITY: "Offer onboarding resource or simplified quick-start path.",
  TRUST: "Provide social proof, credentials, and transparent refund policy.",
  TIMING: "Nurture with value content; set follow-up trigger.",
};

export async function runObjectionMap(videoId: string) {
  const comments = await prisma.commentIntelligence.findMany({
    where: { videoId },
  });

  const archetypeStats = new Map<
    string,
    { count: number; intensitySum: number; examples: string[] }
  >();

  for (const c of comments) {
    for (const [type, pattern] of Object.entries(OBJECTION_PATTERNS)) {
      if (!pattern.test(c.rawText)) continue;

      await prisma.commentIntelligence.update({
        where: { id: c.id },
        data: { objectionType: type },
      });

      const stats = archetypeStats.get(type) || { count: 0, intensitySum: 0, examples: [] };
      stats.count++;
      stats.intensitySum += c.intensity ?? 5;
      if (stats.examples.length < 3) stats.examples.push(c.rawText.slice(0, 120));
      archetypeStats.set(type, stats);
      break;
    }
  }

  const total = comments.length || 1;
  const objectionMap = Array.from(archetypeStats.entries())
    .map(([archetype, stats]) => {
      const frequency = stats.count / total;
      const weightedIntensity = stats.intensitySum / stats.count / 10;
      const specificity = Math.min(1, stats.examples.length / 3);
      const obScore = frequency * 0.5 + weightedIntensity * 0.3 + specificity * 0.2;
      return {
        archetype,
        obScore,
        frequency,
        count: stats.count,
        strategy: STRATEGIES[archetype],
        examples: stats.examples,
      };
    })
    .sort((a, b) => b.obScore - a.obScore);

  return { objectionMap };
}
