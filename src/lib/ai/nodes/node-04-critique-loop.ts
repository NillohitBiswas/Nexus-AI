import { groqChatCompletion, type GroqUsageContext } from "../groq-client";
import { GROQ_MODEL_FAST, GROQ_MODEL_LARGE } from "../groq-models";
import { YouTubeComment } from "../../youtube/provider-factory";

export interface ClassifiedComment extends YouTubeComment {
  category: string;
  sentiment: number;
  intensity: number;
  intent: string;
  confidenceScore: number;
}

const MAPPER_PROMPT = `Analyze this YouTube comment and classify it.
Output valid JSON only: { "category": "BUG|FEATURE|PRAISE|COMPLAINT|QUESTION|OTHER", "sentiment": [-1.0 to 1.0], "intensity": [1 to 10], "intent": "String describing user intent" }
Comment: `;

const CRITIC_PROMPT = `Two models disagreed on classifying this YouTube comment.
Resolve the conflict. Note: 'Great, another bug' = NEGATIVE (sarcasm).
Output valid JSON only with the same format.
Comment: `;

export async function runCritiqueLoop(
  batch: YouTubeComment[],
  usageCtx?: GroqUsageContext,
): Promise<{ classified: ClassifiedComment[]; criticInvocations: number }> {
  let criticInvocations = 0;
  const classified: ClassifiedComment[] = [];

  for (const comment of batch) {
    // 1. Dual Mapper
    const [mapperA, mapperB] = await Promise.all([
      callGroqMapper(comment.rawText, 0.10, usageCtx),
      callGroqMapper(comment.rawText, 0.15, usageCtx),
    ]);

    let finalResult = mapperA;
    let confidenceScore = 1.0;

    // 2. Disagreement check
    if (mapperA.category !== mapperB.category || Math.abs(mapperA.sentiment - mapperB.sentiment) > 0.4) {
      criticInvocations++;
      confidenceScore = 0.5;
      
      // 3. Critic
      const critic = await callGroqCritic(comment.rawText, mapperA, mapperB, usageCtx);
      finalResult = critic;
    } else {
      // Agreement
      confidenceScore = 0.95;
    }

    classified.push({
      ...comment,
      category: finalResult.category,
      sentiment: finalResult.sentiment,
      intensity: finalResult.intensity,
      intent: finalResult.intent,
      confidenceScore,
    });
  }

  return { classified, criticInvocations };
}

async function callGroqMapper(
  text: string,
  temperature: number,
  ctx?: GroqUsageContext,
) {
  const completion = await groqChatCompletion(
    {
      messages: [{ role: "user", content: MAPPER_PROMPT + text }],
      model: GROQ_MODEL_FAST,
      temperature,
      response_format: { type: "json_object" },
    },
    { ...ctx, operation: ctx?.operation ?? "critique.mapper" },
  );
  return JSON.parse(completion.choices[0]?.message?.content || "{}");
}

async function callGroqCritic(
  text: string,
  a: unknown,
  b: unknown,
  ctx?: GroqUsageContext,
) {
  const completion = await groqChatCompletion(
    {
      messages: [
        { role: "system", content: CRITIC_PROMPT },
        {
          role: "user",
          content: `Comment: ${text}\nModel A: ${JSON.stringify(a)}\nModel B: ${JSON.stringify(b)}`,
        },
      ],
      model: GROQ_MODEL_LARGE,
      temperature: 0.2,
      response_format: { type: "json_object" },
    },
    { ...ctx, operation: ctx?.operation ?? "critique.critic" },
  );
  return JSON.parse(completion.choices[0]?.message?.content || "{}");
}
