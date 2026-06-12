import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/db";
import { trackGeminiEmbed } from "@/lib/usage/track";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type EmbedUsageContext = {
  userId?: string | null;
  scanId?: string | null;
};

export async function embedText(
  text: string,
  ctx?: EmbedUsageContext,
): Promise<number[]> {
  try {
    const result = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: text,
      config: {
        outputDimensionality: 768,
      },
    });

    if (result.embeddings && result.embeddings.length > 0 && result.embeddings[0].values) {
      trackGeminiEmbed({
        userId: ctx?.userId,
        scanId: ctx?.scanId,
        units: 1,
      });
      return result.embeddings[0].values;
    }
    
    throw new Error("No embedding values returned");
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

export async function lookupCache(embedding: number[], threshold = 0.88) {
  // Use Prisma's $queryRaw to perform a vector similarity search on the InsForge PostgreSQL DB
  // This calculates cosine distance (1 - cosine similarity). 
  // If threshold is 0.88, we want distance < 1 - 0.88 = 0.12
  const maxDistance = 1 - threshold;
  
  // Format the array as a pgvector string representation: '[1, 2, 3...]'
  const embeddingStr = `[${embedding.join(',')}]`;

  const matches = await prisma.$queryRaw`
    SELECT id, category, sentiment, intensity, intent
    FROM "CommentIntelligence"
    WHERE category IS NOT NULL
      AND embedding <=> ${embeddingStr}::vector(768) < ${maxDistance}
    ORDER BY embedding <=> ${embeddingStr}::vector(768)
    LIMIT 1;
  `;

  if (Array.isArray(matches) && matches.length > 0) {
    return matches[0];
  }
  return null;
}

export async function storeEmbedding(commentId: string, embedding: number[]) {
  const embeddingStr = `[${embedding.join(',')}]`;
  
  // Update the comment's embedding using raw SQL because Prisma 
  // doesn't natively map vector fields yet without queryRaw
  await prisma.$executeRaw`
    UPDATE "CommentIntelligence"
    SET embedding = ${embeddingStr}::vector(768)
    WHERE id = ${commentId};
  `;
}
