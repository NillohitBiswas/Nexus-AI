import Groq from "groq-sdk";
import { trackGroqCompletion } from "@/lib/usage/track";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from "groq-sdk/resources/chat/completions";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export type GroqUsageContext = {
  userId?: string | null;
  scanId?: string | null;
  operation: string;
};

export async function groqChatCompletion(
  params: ChatCompletionCreateParamsNonStreaming,
  ctx: GroqUsageContext,
): Promise<ChatCompletion> {
  const completion = await groq.chat.completions.create(params);
  const usage = completion.usage;
  trackGroqCompletion({
    userId: ctx.userId,
    scanId: ctx.scanId,
    model: params.model,
    operation: ctx.operation,
    promptTokens: usage?.prompt_tokens,
    completionTokens: usage?.completion_tokens,
    totalTokens: usage?.total_tokens,
  });
  return completion;
}
