export function extractMainTopic(videoTitle: string): string[] {
  if (!videoTitle) return [];
  const titleClean = videoTitle.replace(/\b(review|tutorial|how\s+to|unboxing|specs|comparison|vs|versus|worth\s+it|hands\s+on|first\s+look|unbiased|ultimate)\b/gi, "").trim();
  const matches = titleClean.match(/\b([A-Za-z0-9]+)\b/g);
  if (!matches) return [];
  return matches.map(m => m.toLowerCase()).filter(m => m.length > 2);
}
