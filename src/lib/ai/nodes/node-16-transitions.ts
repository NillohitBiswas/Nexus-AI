import { prisma } from "@/lib/db";

const TRANSITION_PATTERNS: Record<string, RegExp> = {
  CONFUSION_CLARITY: /\b(was confused|now (i )?understand|finally (get|got) it|makes sense now)\b/i,
  SKEPTICISM_CONVICTION: /\b(was skeptical|now convinced|didn't believe|changed my mind)\b/i,
  FRUSTRATION_RELIEF: /\b(frustrated|relieved|finally works|fixed my)\b/i,
  IGNORANCE_AWARENESS: /\b(didn't know|now i know|learned that|had no idea)\b/i,
  APATHY_MOTIVATION: /\b(didn't care|motivated|inspired|going to try)\b/i,
};

function extractBeforePhrase(text: string, type: string): string {
  const beforeWords = ["was confused", "was skeptical", "frustrated", "didn't know", "didn't care"];
  for (const phrase of beforeWords) {
    if (text.toLowerCase().includes(phrase)) return phrase;
  }
  return type.split("_")[0].toLowerCase();
}

export async function runTransitionDetector(
  videoId: string,
  weightedSentiment: number
): Promise<{
  transformationScore: number;
  contentEffectivenessScore: number;
  dominantTransition: string | null;
  beforeStateVocabulary: Array<{ phrase: string; score: number }>;
  thumbnailCopySuggestions: string[];
  transitionCounts: Record<string, number>;
}> {
  const comments = await prisma.commentIntelligence.findMany({
    where: { videoId },
  });

  const transitionCounts: Record<string, number> = {};
  const beforePhrases: Record<string, { phrase: string; count: number; likeWeight: number }> = {};

  let positiveTransitions = 0;

  for (const c of comments) {
    for (const [type, pattern] of Object.entries(TRANSITION_PATTERNS)) {
      if (!pattern.test(c.rawText)) continue;

      const beforeStateText = extractBeforePhrase(c.rawText, type);
      await prisma.commentIntelligence.update({
        where: { id: c.id },
        data: { transitionType: type, beforeStateText },
      });

      transitionCounts[type] = (transitionCounts[type] || 0) + 1;
      positiveTransitions++;

      const key = beforeStateText;
      const existing = beforePhrases[key] || { phrase: key, count: 0, likeWeight: 0 };
      existing.count++;
      existing.likeWeight += Math.log10((c.likeCount ?? 0) + 1);
      beforePhrases[key] = existing;
      break;
    }
  }

  const totalComments = comments.length || 1;
  const transformationScore = (positiveTransitions / totalComments) * 100;

  const contentEffectivenessScore =
    transformationScore * 0.6 + Math.max(0, (weightedSentiment + 1) * 50) * 0.4;

  const dominantTransition =
    Object.entries(transitionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const beforeStateVocabulary = Object.values(beforePhrases)
    .map((p) => ({ phrase: p.phrase, score: p.count * p.likeWeight }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const thumbnailCopySuggestions = dominantTransition
    ? [
        `From ${dominantTransition.split("_")[0]} to ${dominantTransition.split("_")[1]}`,
        `Watch what happens when ${beforeStateVocabulary[0]?.phrase ?? "you"}...`,
      ]
    : [];

  return {
    transformationScore,
    contentEffectivenessScore,
    dominantTransition,
    beforeStateVocabulary,
    thumbnailCopySuggestions,
    transitionCounts,
  };
}
