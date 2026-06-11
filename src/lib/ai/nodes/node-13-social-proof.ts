import { prisma } from "@/lib/db";
import { extractMainTopic } from "./topic-helper";

const TRANSFORMATION_WORDS =
  /\b(transformed|changed my life|finally|game.?changer|worth it|saved me)\b/i;

const GENERIC_BOILERPLATE =
  /^(amazing video\.?|great video\.?|good video\.?|nice video\.?|love the video\.?|love this video\.?|detailed breakdown\.?|thank(s|\s+you)\s+for\s+(this|the)\s+video\.?|informative video\.?|keep it up\.?|great content\.?|nice content\.?|good content\.?|love your channel\.?|great channel\.?|excellent video\.?|very helpful video\.?|wonderful video\.?|awesome video\.?|best video\.?|i love your video\.?|i love this video\.?)$/i;

function gradeTestimonial(ts: number): string | null {
  if (ts >= 0.8) return "A";
  if (ts >= 0.6) return "B";
  if (ts >= 0.4) return "C";
  return null;
}

function scoreTestimonial(
  text: string,
  sentiment: number,
  intensity: number,
  likeCount: number,
  mainTopicTerms: string[]
): number {
  const textLower = text.toLowerCase();

  // 1. Real Feedback of the product or topic (85% weight)
  const productAttributes = /\b(product|tool|camera|battery|screen|performance|ui|colors|software|hardware|specs|price|worth|value|feature|design|use|using|run|build|speed)\b/i;
  const mentionsTopic = mainTopicTerms.some(term => textLower.includes(term));
  const hasProductDetails = productAttributes.test(textLower) || mentionsTopic;

  const lengthScore = Math.min(1, text.length / 200);
  const detailScore = (hasProductDetails ? 0.7 : 0.2) + (/\d+/.test(text) ? 0.3 : 0);
  const productFeedbackScore = detailScore * 0.6 + lengthScore * 0.4;

  // 2. Creator Praise (15% weight)
  const isPraise = /\b(great|amazing|love|best|helpful|thank|thanks|good|awesome|perfect|creative|channel|video|creator|tutorial|explanation|breakdown|guide)\b/i.test(textLower);
  const creatorPraiseScore = isPraise ? 1.0 : 0.0;

  // Weighted base score
  const baseTestimonialScore = (productFeedbackScore * 0.85) + (creatorPraiseScore * 0.15);

  // Sentiment & Credibility adjustments
  const sentimentScore = Math.max(0, Math.min(1, (sentiment + 1) / 2));
  const credibilityScore = Math.min(1, Math.log10(likeCount + 1) / 2);

  const finalScore = baseTestimonialScore * 0.5 + sentimentScore * 0.3 + credibilityScore * 0.2;
  return Math.min(1, finalScore);
}

export async function runSocialProofHarvester(videoId: string) {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { title: true }
  });
  const videoTitle = video?.title || "";
  const mainTopicTerms = extractMainTopic(videoTitle);

  const comments = await prisma.commentIntelligence.findMany({
    where: { videoId },
  });

  const proofItems: Array<{
    commentId: string;
    rawText: string;
    authorName: string;
    testimonialScore: number;
    testimonialGrade: string;
    likeCount: number;
  }> = [];

  let gradeACount = 0;
  let gradeBCount = 0;

  for (const c of comments) {
    const intensity = c.intensity ?? 0;
    const sentiment = c.sentiment ?? 0;
    const likeCount = c.likeCount ?? 0;

    // Filter out generic boilerplate comments
    if (GENERIC_BOILERPLATE.test(c.rawText.trim())) {
      continue;
    }

    const preScreen =
      intensity >= 6 &&
      sentiment >= 0.4 &&
      (/\d+/.test(c.rawText) || TRANSFORMATION_WORDS.test(c.rawText) || likeCount > 20 || mainTopicTerms.some(term => c.rawText.toLowerCase().includes(term)));

    if (!preScreen) continue;

    const testimonialScore = scoreTestimonial(c.rawText, sentiment, intensity, likeCount, mainTopicTerms);
    const testimonialGrade = gradeTestimonial(testimonialScore);
    if (!testimonialGrade) continue;

    if (testimonialGrade === "A") gradeACount++;
    if (testimonialGrade === "B") gradeBCount++;

    await prisma.commentIntelligence.update({
      where: { id: c.id },
      data: { testimonialScore, testimonialGrade },
    });

    proofItems.push({
      commentId: c.id,
      rawText: c.rawText,
      authorName: c.authorName,
      testimonialScore,
      testimonialGrade,
      likeCount,
    });
  }

  proofItems.sort((a, b) => b.testimonialScore - a.testimonialScore);

  return {
    proofLibrary: proofItems.slice(0, 10),
    gradeACount,
    gradeBCount,
  };
}
