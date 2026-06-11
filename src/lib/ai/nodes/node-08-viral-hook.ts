import { prisma } from "@/lib/db";
import { groqChatCompletion } from "../groq-client";
import { GROQ_MODEL_LARGE } from "../groq-models";

const ARCHETYPE_PATTERNS: Record<string, RegExp> = {
  POLARIZATION: /\b(wrong|myth|actually|unpopular|controversial|debate)\b/i,
  MYTH_BUSTING: /\b(myth|busted|truth is|they lied|not true)\b/i,
  DEEP_UTILITY: /\b(how to|step by step|tutorial|guide|walkthrough)\b/i,
  SOCIAL_PROOF: /\b(everyone|thousands|results|proof|case study)\b/i,
  FEAR_LOSS: /\b(mistake|fail|lose|warning|don't|avoid)\b/i,
  CHALLENGE: /\b(challenge|bet|try this|can you|dare)\b/i,
};

export async function runViralHookPredictor(
  videoId: string,
  channelId: string,
  videoTitle: string,
  userId?: string | null,
  scanId?: string | null
) {
  const comments = await prisma.commentIntelligence.findMany({
    where: { videoId },
  });

  const archetypeDepths: Record<string, number[]> = {};
  const allDepths: number[] = [];

  for (const c of comments) {
    const depth = c.threadDepth || 1;
    allDepths.push(depth);
    for (const [archetype, pattern] of Object.entries(ARCHETYPE_PATTERNS)) {
      if (pattern.test(c.rawText)) {
        if (!archetypeDepths[archetype]) archetypeDepths[archetype] = [];
        archetypeDepths[archetype].push(depth);
      }
    }
  }

  const globalAvgDepth =
    allDepths.length > 0 ? allDepths.reduce((a, b) => a + b, 0) / allDepths.length : 1;

  const engagementArchetypes = Object.entries(archetypeDepths).map(([archetype, depths]) => {
    const avgDepth = depths.reduce((a, b) => a + b, 0) / depths.length;
    const em = globalAvgDepth > 0 ? avgDepth / globalAvgDepth : 1;
    return { archetype, avgDepth, engagementMultiplier: em, matchCount: depths.length };
  });

  engagementArchetypes.sort((a, b) => b.engagementMultiplier - a.engagementMultiplier);

  const dominant = engagementArchetypes[0]?.archetype ?? "DEEP_UTILITY";

  let viralHookPrediction: { titles: Array<{ title: string; predictedEM: number }> } = {
    titles: [],
  };

  if (process.env.GROQ_API_KEY) {
    try {
      const completion = await groqChatCompletion({
        messages: [
          {
            role: "user",
            content: `Generate 3 YouTube title suggestions for a video currently titled "${videoTitle}".
Dominant engagement archetype: ${dominant}.
Top archetypes: ${JSON.stringify(engagementArchetypes.slice(0, 3))}.
Return JSON only: { "titles": [{ "title": "string", "predictedEM": number }] }`,
          },
        ],
        model: GROQ_MODEL_LARGE,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }, {
        userId,
        scanId,
        operation: "viral.hook"
      });
      viralHookPrediction = JSON.parse(
        completion.choices[0]?.message?.content || '{"titles":[]}'
      );
    } catch (e) {
      console.error("Viral hook LLM failed:", e);
      viralHookPrediction = {
        titles: [
          { title: `${videoTitle} — What Nobody Tells You`, predictedEM: 1.2 },
          { title: `I Tested ${dominant.replace("_", " ")} — Here's What Happened`, predictedEM: 1.1 },
          { title: `Stop Doing This Wrong (${videoTitle})`, predictedEM: 1.0 },
        ],
      };
    }
  }

  await prisma.video.update({
    where: { id: videoId },
    data: { dominantArchetype: dominant },
  });

  return { engagementArchetypes, viralHookPrediction, dominantArchetype: dominant };
}
