import { prisma } from "@/lib/db";
import { embedText } from "@/lib/ai/semantic-cache";
import { groqChatCompletion } from "@/lib/ai/groq-client";
import { GROQ_MODEL_LARGE } from "@/lib/ai/groq-models";

function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return normA === 0 || normB === 0 ? 0 : dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function runNewsroomNode(scanId: string, userId: string) {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { themes: true },
  });

  if (!scan) return [];

  const themesData = scan.themes.sort((a, b) => b.commentCount - a.commentCount).slice(0, 5);
  if (themesData.length === 0) return [];

  const totalScanComments = await prisma.commentIntelligence.count({
    where: { videoId: scan.videoId }
  });
  const totalComments = totalScanComments > 0 ? totalScanComments : themesData.reduce((sum, t) => sum + t.commentCount, 0);

  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey || apiKey.includes("<PLACEHOLDER")) {
    return [];
  }

  const newsItems: Array<{
    title: string;
    description: string;
    themeKey: string;
    commentVolumeNorm: number;
    externalTrendGrowth: number;
  }> = [];

  for (const theme of themesData) {
    const commentVolumeNorm = totalComments > 0 ? theme.commentCount / totalComments : 0.1;
    let externalTrendGrowth = 1.0;

    try {
      const q = encodeURIComponent(theme.themeKey);
      const url24h = `https://newsdata.io/api/1/news?apikey=${apiKey}&q=${q}&language=en&timeframe=24`;
      const res24 = await fetch(url24h);
      
      if (res24.ok) {
        const data = await res24.json();
        const todayNews = data.results || data.news?.results || [];
        
        try {
          const url7d = `https://newsdata.io/api/1/news?apikey=${apiKey}&q=${q}&language=en&timeframe=168`;
          const res7 = await fetch(url7d);
          if (res7.ok) {
            const data7 = await res7.json();
            const count24 = data.totalResults || todayNews.length;
            const count7d = data7.totalResults || (count24 * 7);
            if (count7d > 0) {
              externalTrendGrowth = count24 / (count7d / 7);
            }
          }
        } catch (e) {
          console.error("Failed to fetch 7-day trend", e);
        }

        for (const n of todayNews.slice(0, 5)) {
          newsItems.push({
            title: n.title,
            description: n.description || n.snippet || n.content || "",
            themeKey: theme.themeKey,
            commentVolumeNorm,
            externalTrendGrowth
          });
        }
      }
    } catch (e) {
      console.error("News fetch failed:", e);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  const themeEmbeddings = new Map<string, number[]>();
  for (const t of themesData) {
    try {
      themeEmbeddings.set(t.themeKey, await embedText(t.themeKey));
    } catch (e) {
      console.error("Failed to embed theme", e);
    }
  }

  const correlatedItems = [];
  for (const item of newsItems) {
    try {
      const itemText = `${item.title}. ${item.description}`.slice(0, 1000);
      const itemEmbedding = await embedText(itemText);
      const themeEmbedding = themeEmbeddings.get(item.themeKey);
      
      if (themeEmbedding) {
        const similarity = cosineSimilarity(itemEmbedding, themeEmbedding);
        if (similarity >= 0.65) {
          const cr = (item.commentVolumeNorm * 0.40) + (item.externalTrendGrowth * 0.60);
          correlatedItems.push({
            ...item,
            similarity,
            cr
          });
        }
      }
    } catch (e) {
      console.error("Failed to embed news item", e);
    }
  }
  
  const topCorrelatedItems = correlatedItems.sort((a, b) => b.cr - a.cr).slice(0, 3);

  if (!process.env.GROQ_API_KEY || topCorrelatedItems.length === 0) return [];
  
  const promptData = topCorrelatedItems.map(item => ({
    theme: item.themeKey,
    headline: item.title,
    context: item.description,
    relevanceScore: item.cr
  }));

  const completion = await groqChatCompletion(
    {
      messages: [
        {
          role: "user",
          content: `You are an expert YouTube strategist.
I have top correlated news items for a channel's audience themes.
Correlated items: ${JSON.stringify(promptData)}

Generate a specific video title and hook for each item. Return ONLY a JSON array of objects, where each object has:
- "headline": The proposed video title (catchy, high CTR)
- "themeLabel": The theme key
- "score": The relevance score provided
- "hook": The specific video hook

Do not include any markdown formatting, backticks, or text outside the JSON array.`,
        },
      ],
      model: GROQ_MODEL_LARGE,
      temperature: 0.7,
    },
    { userId, scanId, operation: "newsroom.scan_ideas" },
  );

  try {
    let content = completion.choices[0]?.message?.content || "[]";
    content = content.replace(/^```json/, "").replace(/```$/, "").trim();
    return JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse Llama 3 70B response:", e);
    return [];
  }
}
