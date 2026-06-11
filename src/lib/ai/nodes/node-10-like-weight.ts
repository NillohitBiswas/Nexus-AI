import { ClassifiedComment } from "./node-04-critique-loop";

export function applyLikeWeights(comments: ClassifiedComment[]) {
  for (const comment of comments) {
    // Node 10: EffectiveWeight = 1 + log10(1 + likeCount)
    const effectiveWeight = 1 + Math.log10(1 + (comment.likeCount || 0));
    
    // We store the effectiveWeight back onto the comment object
    (comment as any).effectiveWeight = effectiveWeight;
  }
  
  return comments;
}
