import { prisma } from "@/lib/db";
import { extractMainTopic } from "./topic-helper";

const COMPETITOR_PATTERNS =
  /\b(vs\.?|versus|switching from|better than|compared to|moved from|left|iphone|pixel|galaxy|samsung|oneplus|xiaomi|redmi|realme|oppo|vivo|motorola|asus|sony|huawei|apple|google)\b/i;

const BRAND_KEYWORDS = ["iphone", "pixel", "galaxy", "samsung", "oneplus", "xiaomi", "redmi", "realme", "oppo", "vivo", "motorola", "sony", "huawei", "apple", "google"];

const SIGNAL_KEYWORDS: Record<string, RegExp> = {
  DEFECTOR: /\b(switching|moved from|left|defect)\b/i,
  FEATURE_GAP: /\b(missing|wish it had|doesn't have|lacks)\b/i,
  PRICE_COMPARE: /\b(cheaper|expensive|price|cost)\b/i,
  LOYAL_DEFENDER: /\b(stick with|loyal|best product|love)\b/i,
  CATEGORY_LEADER: /\b(leader|#1|dominant|market)\b/i,
  NEGATIVE_PROOF: /\b(worse|terrible|awful|hate)\b/i,
};

function normalizeEntityName(name: string): string {
  return name
    .replace(/\b(inc|llc|corp|ltd|co)\b\.?/gi, "")
    .trim()
    .toLowerCase();
}

function extractEntities(text: string): string[] {
  const entities: string[] = [];
  const vsMatch = text.match(/\bvs\.?\s+([A-Z][a-zA-Z0-9]+)/i);
  if (vsMatch) entities.push(vsMatch[1]);
  const fromMatch = text.match(/(?:from|than)\s+([A-Z][a-zA-Z0-9]+)/i);
  if (fromMatch) entities.push(fromMatch[1]);
  const capitalized = text.match(/\b([A-Z][a-z]{2,})\b/g);
  if (capitalized) {
    for (const w of capitalized) {
      if (!["The", "This", "That", "You", "Your", "They"].includes(w)) {
        entities.push(w);
      }
    }
  }
  return [...new Set(entities.map(normalizeEntityName))].filter((e) => e.length > 2);
}

function classifySignal(text: string): string {
  for (const [signal, pattern] of Object.entries(SIGNAL_KEYWORDS)) {
    if (pattern.test(text)) return signal;
  }
  return "CATEGORY_LEADER";
}

export async function runCompetitorRadar(scanId: string, videoId: string) {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { title: true }
  });
  const videoTitle = video?.title || "";
  const mainTopicTerms = extractMainTopic(videoTitle);

  const comments = await prisma.commentIntelligence.findMany({
    where: { videoId },
  });

  await prisma.competitorMention.deleteMany({ where: { scanId } });

  const entityMap = new Map<
    string,
    { mentions: number; sentimentSum: number; signals: Record<string, number>; defectors: string[] }
  >();

  for (const c of comments) {
    if (!COMPETITOR_PATTERNS.test(c.rawText)) continue;

    const entities = extractEntities(c.rawText);

    // Contextual phone/brand extraction
    for (const brand of BRAND_KEYWORDS) {
      if (c.rawText.toLowerCase().includes(brand)) {
        entities.push(brand);
      }
    }

    const signalType = classifySignal(c.rawText);
    const sentiment = c.sentiment ?? 0;

    // Filter out mentions of the main topic brand
    const filteredEntities = [...new Set(entities)].filter(e => {
      const normalized = e.toLowerCase();
      return !mainTopicTerms.some(term => normalized.includes(term) || term.includes(normalized));
    });

    for (const entity of filteredEntities) {
      await prisma.competitorMention.create({
        data: {
          scanId,
          commentId: c.id,
          entity,
          signalType,
          netSentiment: sentiment,
          rawText: c.rawText.slice(0, 300),
        },
      });

      const stats = entityMap.get(entity) || {
        mentions: 0,
        sentimentSum: 0,
        signals: {},
        defectors: [],
      };
      stats.mentions++;
      stats.sentimentSum += sentiment;
      stats.signals[signalType] = (stats.signals[signalType] || 0) + 1;
      if (signalType === "DEFECTOR" && (c.conversionProb ?? 0) >= 0.85) {
        stats.defectors.push(c.rawText.slice(0, 120));
      }
      entityMap.set(entity, stats);
    }
  }

  const competitorRadar = Array.from(entityMap.entries())
    .map(([entity, stats]) => ({
      entity,
      mentions: stats.mentions,
      netSentiment: stats.sentimentSum / stats.mentions,
      signalBreakdown: stats.signals,
      topDefectors: stats.defectors.slice(0, 5),
      featureGaps: stats.signals.FEATURE_GAP
        ? [`${entity}: feature gap mentioned ${stats.signals.FEATURE_GAP} times`]
        : [],
    }))
    .sort((a, b) => b.mentions - a.mentions);

  return { competitorRadar };
}
