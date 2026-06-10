import { prisma } from "@/lib/db";

const BUYING_KEYWORDS =
  /\b(buy|purchase|pricing|trial|demo|subscribe|team plan|switching from|enterprise)\b/i;

const INTENT_SCORES: Record<string, number> = {
  HIGH_INTENT: 1.0,
  COMPETITOR_DEFECTOR: 0.9,
  TEAM_BUYER: 0.8,
  TRIAL_REQUEST: 0.7,
  PRICE_INQUIRY: 0.6,
};

function detectBuyingSignal(text: string, intent?: string | null): string | null {
  const lower = text.toLowerCase();
  if (/\b(switching from|moved from|left)\b/.test(lower)) return "COMPETITOR_DEFECTOR";
  if (/\b(team|our company|we need|bulk)\b/.test(lower)) return "TEAM_BUYER";
  if (/\b(trial|try it|test drive)\b/.test(lower)) return "TRIAL_REQUEST";
  if (/\b(price|pricing|cost|how much)\b/.test(lower)) return "PRICE_INQUIRY";
  if (/\b(buy|purchase|sign up|where do i get)\b/.test(lower)) return "HIGH_INTENT";
  if (intent?.toLowerCase().includes("purchase")) return "HIGH_INTENT";
  return null;
}

export async function runLeadsEngine(videoId: string) {
  const comments = await prisma.commentIntelligence.findMany({
    where: { videoId },
  });

  const leads: Array<{
    commentId: string;
    rawText: string;
    authorName: string;
    buyingSignal: string;
    conversionProb: number;
    pc: number;
  }> = [];

  for (const c of comments) {
    const intensity = c.intensity ?? 0;
    if (intensity < 5 && !BUYING_KEYWORDS.test(c.rawText)) continue;

    const buyingSignal = detectBuyingSignal(c.rawText, c.intent);
    if (!buyingSignal) continue;

    const intentScore = INTENT_SCORES[buyingSignal] ?? 0.5;
    const conversionProb = intentScore;
    const pc = (intensity / 10) * 0.5 + intentScore * 0.5;

    await prisma.commentIntelligence.update({
      where: { id: c.id },
      data: { buyingSignal, conversionProb },
    });

    leads.push({
      commentId: c.id,
      rawText: c.rawText.slice(0, 200),
      authorName: c.authorName,
      buyingSignal,
      conversionProb,
      pc,
    });
  }

  leads.sort((a, b) => b.pc - a.pc);

  return {
    leadCount: leads.length,
    topLeads: leads.slice(0, 10),
  };
}
