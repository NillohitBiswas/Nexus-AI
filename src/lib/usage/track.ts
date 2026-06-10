import { prisma } from "@/lib/db";
import {
  estimateApifyCost,
  estimateGeminiEmbedCost,
  estimateGroqCost,
  estimateYoutubeCost,
} from "./cost-estimates";

export type UsageProvider =
  | "GROQ"
  | "GEMINI"
  | "YOUTUBE"
  | "APIFY"
  | "INNGEST"
  | "INSFORGE"
  | "REDIS";

export interface TrackApiUsageInput {
  provider: UsageProvider;
  operation: string;
  userId?: string | null;
  scanId?: string | null;
  model?: string | null;
  units?: number;
  amount?: number;
  metadata?: Record<string, unknown>;
}

export async function trackApiUsage(input: TrackApiUsageInput): Promise<void> {
  try {
    await prisma.apiUsageEvent.create({
      data: {
        userId: input.userId ?? null,
        scanId: input.scanId ?? null,
        provider: input.provider,
        operation: input.operation,
        model: input.model ?? null,
        units: input.units ?? 1,
        amount: input.amount ?? 0,
        metadata: input.metadata ? (input.metadata as any) : undefined,
      },
    });
  } catch (err) {
    console.error("[usage] trackApiUsage failed:", err);
  }
}

export function trackApiUsageFireAndForget(input: TrackApiUsageInput): void {
  void trackApiUsage(input);
}

export function trackGroqCompletion(opts: {
  userId?: string | null;
  scanId?: string | null;
  model: string;
  operation: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}): void {
  const tokens =
    opts.totalTokens ??
    ((opts.promptTokens ?? 0) + (opts.completionTokens ?? 0) || 1);
  trackApiUsageFireAndForget({
    provider: "GROQ",
    operation: opts.operation,
    userId: opts.userId,
    scanId: opts.scanId,
    model: opts.model,
    units: tokens,
    amount: estimateGroqCost(opts.model, tokens),
    metadata: {
      promptTokens: opts.promptTokens,
      completionTokens: opts.completionTokens,
    },
  });
}

export function trackGeminiEmbed(opts: {
  userId?: string | null;
  scanId?: string | null;
  units?: number;
}): void {
  const units = opts.units ?? 1;
  trackApiUsageFireAndForget({
    provider: "GEMINI",
    operation: "embed",
    userId: opts.userId,
    scanId: opts.scanId,
    model: "gemini-embedding-2",
    units,
    amount: estimateGeminiEmbedCost(units),
  });
}

export function trackYoutubeCall(opts: {
  userId?: string | null;
  scanId?: string | null;
  operation: string;
  commentCount?: number;
}): void {
  trackApiUsageFireAndForget({
    provider: "YOUTUBE",
    operation: opts.operation,
    userId: opts.userId,
    scanId: opts.scanId,
    units: 1,
    amount: estimateYoutubeCost(1),
    metadata: opts.commentCount != null ? { commentCount: opts.commentCount } : undefined,
  });
}

export function trackApifyRun(opts: {
  userId?: string | null;
  scanId?: string | null;
  commentCount?: number;
}): void {
  trackApiUsageFireAndForget({
    provider: "APIFY",
    operation: "actor.run",
    userId: opts.userId,
    scanId: opts.scanId,
    units: 1,
    amount: estimateApifyCost(1),
    metadata: opts.commentCount != null ? { commentCount: opts.commentCount } : undefined,
  });
}

export function trackInngestStep(opts: {
  userId?: string | null;
  scanId?: string | null;
  functionId: string;
  stepId: string;
  durationMs?: number;
}): void {
  trackApiUsageFireAndForget({
    provider: "INNGEST",
    operation: `${opts.functionId}.${opts.stepId}`,
    userId: opts.userId,
    scanId: opts.scanId,
    units: 1,
    metadata: opts.durationMs != null ? { durationMs: opts.durationMs } : undefined,
  });
}

export function trackInsforgeCall(opts: {
  userId?: string | null;
  operation: string;
}): void {
  trackApiUsageFireAndForget({
    provider: "INSFORGE",
    operation: opts.operation,
    userId: opts.userId,
    units: 1,
  });
}

export function trackRedisRateLimit(opts: { key: string; allowed: boolean }): void {
  trackApiUsageFireAndForget({
    provider: "REDIS",
    operation: "rate_limit.incr",
    units: 1,
    metadata: { key: opts.key, allowed: opts.allowed },
  });
}
