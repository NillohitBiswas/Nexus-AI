/** Rough USD estimates for dev-admin dashboard only. */
const GROQ_PER_1M_TOKENS: Record<string, number> = {
  "llama-3.1-8b-instant": 0.05,
  "llama-3.3-70b-versatile": 0.59,
};

const GEMINI_EMBED_PER_1K = 0.0001;
const YOUTUBE_PER_CALL = 0.001;
const APIFY_PER_RUN = 0.05;

export function estimateGroqCost(model: string, tokens: number): number {
  const rate = GROQ_PER_1M_TOKENS[model] ?? 0.1;
  return (tokens / 1_000_000) * rate;
}

export function estimateGeminiEmbedCost(units: number): number {
  return (units / 1000) * GEMINI_EMBED_PER_1K;
}

export function estimateYoutubeCost(calls: number): number {
  return calls * YOUTUBE_PER_CALL;
}

export function estimateApifyCost(runs: number): number {
  return runs * APIFY_PER_RUN;
}
