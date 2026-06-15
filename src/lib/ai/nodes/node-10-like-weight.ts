import { ClassifiedComment } from "./node-04-critique-loop";

export function applyLikeWeights(comments: ClassifiedComment[]) {
  type ExtendedComment = ClassifiedComment & { effectiveWeight?: number };
  for (const comment of comments as ExtendedComment[]) {
    // Node 10: EffectiveWeight = 1 + log10(1 + likeCount)
    const effectiveWeight = 1 + Math.log10(1 + (comment.likeCount || 0));

    // Store the effectiveWeight back onto the comment object
    comment.effectiveWeight = effectiveWeight;
  }

  return comments as ExtendedComment[];
}
