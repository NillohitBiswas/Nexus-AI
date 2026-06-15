import { inngest } from "./client";
import { prisma } from "@/lib/db";
import {
  YouTubeProviderFactory,
  StandardYouTubeProvider,
  ApifyProvider,
  type YouTubeComment,
} from "@/lib/youtube/provider-factory";
import { runCritiqueLoop } from "@/lib/ai/nodes/node-04-critique-loop";
import { applyLikeWeights } from "@/lib/ai/nodes/node-10-like-weight";
import { embedText, lookupCache, storeEmbedding } from "@/lib/ai/semantic-cache";
import { decrypt } from "@/lib/crypto";
import { runDeltaComparison } from "@/lib/ai/nodes/node-01-delta-comparison";
import { runChannelBrain } from "@/lib/ai/nodes/node-03-channel-brain";
import { runContentGapExtractor } from "@/lib/ai/nodes/node-06-content-gap";
import { runAudiencePersonaEngine } from "@/lib/ai/nodes/node-11-audience-persona";
import { runThreadConsensusEngine } from "@/lib/ai/nodes/node-15-thread-consensus";
import { runLeadsEngine } from "@/lib/ai/nodes/node-05-leads-engine";
import { runViralHookPredictor } from "@/lib/ai/nodes/node-08-viral-hook";
import { runCompetitorRadar } from "@/lib/ai/nodes/node-12-competitor-radar";
import { GROQ_MODEL_LARGE } from "@/lib/ai/groq-models";
import { runSocialProofHarvester } from "@/lib/ai/nodes/node-13-social-proof";
import { runObjectionMap } from "@/lib/ai/nodes/node-14-objection-map";
import { runTransitionDetector } from "@/lib/ai/nodes/node-16-transitions";
import { groqChatCompletion } from "@/lib/ai/groq-client";
import { trackApifyRun, trackInngestStep, trackYoutubeCall } from "@/lib/usage/track";

function tierAtLeast(tier: string, min: string): boolean {
  const order = ["FREE", "CREATOR", "GROWTH", "AGENCY"];
  return order.indexOf(tier) >= order.indexOf(min);
}
export const analyzeVideoFn = inngest.createFunction(
  {
    id: "analyze-video",
    concurrency: { limit: 5, key: "event.data.userId" },
    triggers: [{ event: "scan/analyze.requested" }],
  },
  async ({ event, step }) => {
    const { videoId, userId, scanId } = event.data;

    // Get current scan record or create one if missing
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { video: { include: { channel: true } } },
    });

    if (!scan) {
      throw new Error(`Scan with ID ${scanId} not found`);
    }

    // Inngest retries re-run the handler; never downgrade a finished scan.
    if (scan.status === "COMPLETE") {
      return { status: "COMPLETE", skipped: true };
    }

    const groqCtx = { userId, scanId, operation: "analyze" };

    try {
      if (scan.status === "PENDING" || scan.status === "FAILED") {
        await prisma.scan.update({
          where: { id: scanId },
          data: { status: "RUNNING", progress: 0.1 },
        });
      }

      // 1. Ingest Comments
      const rawComments = await step.run("ingest-comments", async () => {
        const ingestStarted = Date.now();
        const video = scan.video;
        const channel = video.channel;
        
        let token = "";
        if (channel.youtubeAccessToken) {
          try {
            token = decrypt(channel.youtubeAccessToken);
          } catch (e) {
            console.error("Failed to decrypt access token:", e);
          }
        }

        const isCompetitor =
          scan.isCompetitorScan || channel.isCompetitor || channel.userId !== userId;

        // Quota limits based on tier
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const tier = user?.tier || "FREE";
        // Resolve API key: prefer per-user BYOK credentials, fall back to env
        let resolvedApiKey: string | undefined = process.env.YOUTUBE_API_KEY || undefined;
        try {
          if (user?.byokEnabled && user.credentials) {
            const creds = decrypt(user.credentials);
            const parsed = JSON.parse(creds || "{}");
            if (parsed?.youtubeApiKey) resolvedApiKey = parsed.youtubeApiKey;
          }
        } catch (e) {
          console.error("Failed to resolve BYOK credentials:", e);
        }
        let limit = 100; // Free limit
        if (tier === "CREATOR") limit = 500;
        if (tier === "GROWTH") limit = 2000;
        if (tier === "AGENCY") limit = 5000;

        const validApiKey = resolvedApiKey && !resolvedApiKey.includes("<PLACEHOLDER");
        const validToken = token && !token.includes("<PLACEHOLDER");
        const credentials = {
          token: validToken ? token : undefined,
          apiKey: validApiKey ? resolvedApiKey : undefined,
        };

        const apifyToken = process.env.APIFY_API_TOKEN || "";
        const validApifyToken = apifyToken && !apifyToken.includes("<PLACEHOLDER");

        const useApify = (isCompetitor || limit > 500) && validApifyToken;
        const provider = useApify ? new ApifyProvider() : new StandardYouTubeProvider();

        let result: YouTubeComment[];

        if (provider instanceof ApifyProvider) {
          if (validApifyToken) {
            result = await provider.fetchComments(video.videoId, apifyToken, limit);
            trackApifyRun({
              userId,
              scanId,
              commentCount: result.length,
            });
          } else if (credentials.apiKey || credentials.token) {
            const fallback = new StandardYouTubeProvider();
            result = await fallback.fetchComments(video.videoId, credentials, limit);
            trackYoutubeCall({
              userId,
              scanId,
              operation: "commentThreads.list",
              commentCount: result.length,
            });
          } else {
            result = await provider.fetchComments(video.videoId, apifyToken, limit);
            trackApifyRun({
              userId,
              scanId,
              commentCount: result.length,
            });
          }
        } else {
          if (credentials.apiKey || credentials.token) {
            result = await provider.fetchComments(video.videoId, credentials, limit);
            trackYoutubeCall({
              userId,
              scanId,
              operation: "commentThreads.list",
              commentCount: result.length,
            });
          } else if (validApifyToken) {
            const fallback = new ApifyProvider();
            result = await fallback.fetchComments(video.videoId, apifyToken, limit);
            trackApifyRun({
              userId,
              scanId,
              commentCount: result.length,
            });
          } else {
            result = await provider.fetchComments(video.videoId, credentials, limit);
            trackYoutubeCall({
              userId,
              scanId,
              operation: "commentThreads.list",
              commentCount: result.length,
            });
          }
        }

        trackInngestStep({
          userId,
          scanId,
          functionId: "analyze-video",
          stepId: "ingest-comments",
          durationMs: Date.now() - ingestStarted,
        });

        return result;
      });

      if (!rawComments || rawComments.length === 0) {
        await prisma.scan.update({
          where: { id: scanId },
          data: { status: "COMPLETE", progress: 1.0, completedAt: new Date() },
        });
        return { status: "COMPLETE", count: 0 };
      }

      await prisma.scan.update({
        where: { id: scanId },
        data: { progress: 0.3 },
      });

      // 2. Deduplicate Comments and insert raw structures
      const insertedComments = await step.run("deduplicate-and-insert", async () => {
        const commentsToInsert = [];
        
        for (const rc of rawComments) {
          // Upsert or find existing comment
          const comment = await prisma.commentIntelligence.upsert({
            where: { youtubeCommentId: rc.youtubeCommentId },
            update: {
              likeCount: rc.likeCount,
              replyCount: rc.replyCount,
            },
            create: {
              videoId: scan.videoId,
              parentId: rc.parentId,
              youtubeCommentId: rc.youtubeCommentId,
              rawText: rc.rawText,
              authorName: rc.authorName,
              authorChannelId: rc.authorChannelId,
              likeCount: rc.likeCount,
              replyCount: rc.replyCount,
              publishedAt: new Date(rc.publishedAt),
            },
          });
          commentsToInsert.push(comment);
        }

        return commentsToInsert;
      });

      await prisma.scan.updateMany({
        where: { id: scanId, status: "RUNNING" },
        data: { progress: 0.5 },
      });

      // 3. Map & Classify (Checking cache, embedding, calling Critique Loop)
      const mappedResults = await step.run("map-and-classify", async () => {
        let cacheHits = 0;
        let criticInvocations = 0;
        const processed = [];

        // Batch size for processing to not hit Gemini/Groq rate limits
        const chunkSize = 10;
        for (let i = 0; i < insertedComments.length; i += chunkSize) {
          const chunk = insertedComments.slice(i, i + chunkSize);
          const needsCritique: any[] = [];
          const embeddingMap: Record<string, number[]> = {};

          // Generate embeddings & Check Cache
          await Promise.all(
            chunk.map(async (comment) => {
              try {
                // If comments already classified, skip (only process null categories)
                if (comment.category) {
                  processed.push({ ...comment, fromCache: true });
                  cacheHits++;
                  return;
                }

                // Generate embedding
                const embedding = await embedText(comment.rawText, {
                  userId,
                  scanId,
                });
                embeddingMap[comment.id] = embedding;

                // Lookup cache
                const cached = await lookupCache(embedding);
                if (cached) {
                  // Cache hit
                  const updated = await prisma.commentIntelligence.update({
                    where: { id: comment.id },
                    data: {
                      category: cached.category,
                      sentiment: cached.sentiment,
                      intensity: cached.intensity,
                      intent: cached.intent,
                      fromCache: true,
                    },
                  });
                  await storeEmbedding(comment.id, embedding);
                  processed.push(updated);
                  cacheHits++;
                } else {
                  // Cache miss
                  needsCritique.push(comment);
                }
              } catch (err) {
                console.error(`Error processing cache for comment ${comment.id}:`, err);
                needsCritique.push(comment);
              }
            })
          );

          // Run Critique Loop for cache misses
          if (needsCritique.length > 0) {
            // Map shape for Critique Loop
            const formattedNeedsCritique = needsCritique.map((nc) => ({
              youtubeCommentId: nc.youtubeCommentId,
              rawText: nc.rawText,
              authorName: nc.authorName,
              authorChannelId: nc.authorChannelId,
              likeCount: nc.likeCount,
              replyCount: nc.replyCount,
              parentId: nc.parentId,
              publishedAt: new Date(nc.publishedAt),
            }));

            const { classified, criticInvocations: chunkCritics } =
              await runCritiqueLoop(formattedNeedsCritique, {
                ...groqCtx,
                operation: "critique.loop",
              });
            criticInvocations += chunkCritics;

            for (const item of classified) {
              const matchedComment = needsCritique.find((nc) => nc.youtubeCommentId === item.youtubeCommentId);
              if (matchedComment) {
                const updated = await prisma.commentIntelligence.update({
                  where: { id: matchedComment.id },
                  data: {
                    category: item.category,
                    sentiment: item.sentiment,
                    intensity: item.intensity,
                    intent: item.intent,
                    confidenceScore: item.confidenceScore,
                    fromCache: false,
                  },
                });

                // Store embedding if we generated it
                const embedding = embeddingMap[matchedComment.id];
                if (embedding) {
                  await storeEmbedding(matchedComment.id, embedding);
                }
                
                processed.push(updated);
              }
            }
          }
          
          // Small cooldown to prevent rate limit
          await new Promise((r) => setTimeout(r, 1000));
        }

        const cacheHitRate = processed.length > 0 ? cacheHits / processed.length : 0;
        const allForConfidence = await prisma.commentIntelligence.findMany({
          where: { videoId: scan.videoId },
          select: { confidenceScore: true },
        });
        const confidenceScores = allForConfidence
          .map((c) => c.confidenceScore)
          .filter((s): s is number => s != null);
        const avgConfidence =
          confidenceScores.length > 0
            ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
            : null;
        return { processed, cacheHitRate, criticInvocations, avgConfidence };
      });

      await prisma.scan.updateMany({
        where: { id: scanId, status: "RUNNING" },
        data: { progress: 0.7 },
      });

      // 4. Post-Map weights (Node 10)
      const commentsWithWeights = await step.run("apply-weights", async () => {
        const dbComments = await prisma.commentIntelligence.findMany({
          where: { videoId: scan.videoId },
        });

        // Apply weights logic
        const weighted = applyLikeWeights(dbComments as any);

        // Update database with weights
        for (const w of weighted as any[]) {
          await prisma.commentIntelligence.update({
            where: { id: w.id },
            data: {
              effectiveWeight: w.effectiveWeight,
              weight: w.effectiveWeight, // Set weight as same
            },
          });
        }

        return weighted;
      });

      await prisma.scan.updateMany({
        where: { id: scanId, status: "RUNNING" },
        data: { progress: 0.8 },
      });

      // 5. Reduce Phase (Aggregating and summarizing with Llama 70B)
      const reducerResults = await step.run("reduce-summary", async () => {
        // Calculate aggregate statistics
        const comments = await prisma.commentIntelligence.findMany({
          where: { videoId: scan.videoId },
        });

        const totalComments = comments.length;
        if (totalComments === 0) return { status: "NO_DATA", isEmergency: false, velocity: null };

        let sentimentSum = 0;
        let painIntensitySum = 0;
        let painCount = 0;
        let demandIntensitySum = 0;
        let demandCount = 0;

        // Grouping comments by category for presentation
        const commentsByCategory: Record<string, any[]> = {};
        for (const c of comments) {
          sentimentSum += c.sentiment || 0;
          const category = c.category || "OTHER";
          if (!commentsByCategory[category]) {
            commentsByCategory[category] = [];
          }
          commentsByCategory[category].push(c);

          if (category === "BUG" || category === "COMPLAINT") {
            painIntensitySum += (c.intensity || 0) * (c.effectiveWeight || 1);
            painCount += (c.effectiveWeight || 1);
          } else if (category === "FEATURE" || category === "QUESTION") {
            demandIntensitySum += (c.intensity || 0) * (c.effectiveWeight || 1);
            demandCount += (c.effectiveWeight || 1);
          }
        }

        const avgSentiment = sentimentSum / totalComments;
        const weightedPainIndex = painCount > 0 ? painIntensitySum / painCount : 0;
        const weightedDemandVelocity = demandCount > 0 ? demandIntensitySum / demandCount : 0;

        // Select top high intensity comments of each class to represent to the model
        const representativeComments: any[] = [];
        for (const [cat, items] of Object.entries(commentsByCategory)) {
          // Sort items by effectiveWeight * intensity descending
          const sorted = items.sort((a, b) => {
            const valB = (b.intensity || 0) * (b.effectiveWeight || 1);
            const valA = (a.intensity || 0) * (a.effectiveWeight || 1);
            return valB - valA;
          });
          // Take top 3
          representativeComments.push(...sorted.slice(0, 3).map((s) => ({
            category: s.category,
            text: s.rawText,
            sentiment: s.sentiment,
            intensity: s.intensity,
            likes: s.likeCount,
            intent: s.intent,
          })));
        }

        // Call Groq Llama 3 70B to reduce and generate executive JSON summary
        const prompt = `You are a product intelligence reducer model.
Analyze the following YouTube comments statistics and representative comments to generate a structured product report.
Respond in valid JSON ONLY. No markdown wrapper (except you can return valid JSON).

Stats:
- Total Comments analyzed: ${totalComments}
- Average Sentiment (-1 to 1): ${avgSentiment.toFixed(2)}
- Pain Index (0-10): ${weightedPainIndex.toFixed(2)}
- Demand Velocity (0-10): ${weightedDemandVelocity.toFixed(2)}

Representative Comments:
${JSON.stringify(representativeComments, null, 2)}

Expected JSON Output format:
{
  "executiveSummary": "A clean 3-4 sentence paragraph highlighting user struggles, praises, and primary request trends.",
  "topPainSignals": ["Pain point 1 description (percentage of bug/complaint comments)", "Pain point 2 description"],
  "topDemandSignals": ["Feature request 1 description", "Feature request 2 description"],
  "competitorGap": "Analysis of potential competitor gaps or unmet features mentioned by users."
}
`;

        const completion = await groqChatCompletion(
          {
            messages: [{ role: "user", content: prompt }],
            model: GROQ_MODEL_LARGE,
            temperature: 0.2,
            response_format: { type: "json_object" },
          },
          { ...groqCtx, operation: "reduce.summary" },
        );

        const content = completion.choices[0]?.message?.content || "{}";
        const jsonSummary = JSON.parse(content);

        // Remove old theme logic because runDeltaComparison handles it
        await prisma.scanTheme.deleteMany({ where: { scanId } });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        const tier = user?.tier || "FREE";
        const channelId = scan.video.channelId;
        const videoTitle = scan.video.title;

        const deltaResults = await runDeltaComparison(scanId, scan.videoId);
        const gapResults = await runContentGapExtractor(scan.videoId);
        const threadResults = await runThreadConsensusEngine(scan.videoId, channelId);
        const brainResults = await runChannelBrain(scan.videoId);
        const personaResults = await runAudiencePersonaEngine(jsonSummary, {
          ...groqCtx,
          operation: "persona.engine",
        });

        let leadsResults: Awaited<ReturnType<typeof runLeadsEngine>> = {
          leadCount: 0,
          topLeads: [],
        };
        let viralResults: Awaited<ReturnType<typeof runViralHookPredictor>> = {
          engagementArchetypes: [],
          viralHookPrediction: { titles: [] },
          dominantArchetype: "DEEP_UTILITY",
        };
        let competitorResults: Awaited<ReturnType<typeof runCompetitorRadar>> = {
          competitorRadar: [],
        };
        let proofResults: Awaited<ReturnType<typeof runSocialProofHarvester>> = {
          proofLibrary: [],
          gradeACount: 0,
          gradeBCount: 0,
        };
        let objectionResults: Awaited<ReturnType<typeof runObjectionMap>> = {
          objectionMap: [],
        };
        let transitionResults: Awaited<ReturnType<typeof runTransitionDetector>> = {
          transformationScore: 0,
          contentEffectivenessScore: 0,
          dominantTransition: null,
          beforeStateVocabulary: [],
          thumbnailCopySuggestions: [],
          transitionCounts: {},
        };

        if (tierAtLeast(tier, "GROWTH")) {
          leadsResults = await runLeadsEngine(scan.videoId);
          viralResults = await runViralHookPredictor(scan.videoId, channelId, videoTitle, userId, scanId);
          competitorResults = await runCompetitorRadar(scanId, scan.videoId);
          proofResults = await runSocialProofHarvester(scan.videoId);
          objectionResults = await runObjectionMap(scan.videoId);
          transitionResults = await runTransitionDetector(scan.videoId, avgSentiment);
        }

        await prisma.scan.update({
          where: { id: scanId },
          data: {
            status: "COMPLETE",
            progress: 1.0,
            rawSentiment: avgSentiment,
            rawPainIndex: weightedPainIndex,
            weightedSentiment: avgSentiment,
            weightedPainIndex,
            weightedDemandVelocity,
            executiveSummary: {
              ...jsonSummary,
              personas: personaResults.personas,
            },
            completedAt: new Date(),
            cacheHitRate: mappedResults.cacheHitRate,
            criticInvocations: mappedResults.criticInvocations,
            confidenceScore: mappedResults.avgConfidence ?? undefined,
            threadEngagementScore: threadResults.avgTes,
            viralPotentialSignal: threadResults.viralPotentialSignal,
            superFanCount: brainResults.superFanCount,
            ghostThreadCount: threadResults.ghostThreadCount,
            sentimentDeltas: deltaResults.sentimentDeltas,
            emergencyAlert: deltaResults.isEmergency,
            deltaReport: deltaResults.deltaReport,
            contentGaps: gapResults.contentGaps,
            topContentGap: gapResults.topContentGap,
            gapScore: gapResults.gapScore,
            leadCount: leadsResults.leadCount,
            topLeads: leadsResults.topLeads,
            competitorRadar: competitorResults.competitorRadar,
            objectionMap: objectionResults.objectionMap,
            proofLibrary: proofResults.proofLibrary,
            gradeACount: proofResults.gradeACount,
            gradeBCount: proofResults.gradeBCount,
            transformationScore: transitionResults.transformationScore,
            contentEffectivenessScore: transitionResults.contentEffectivenessScore,
            dominantTransition: transitionResults.dominantTransition,
            beforeStateVocabulary: transitionResults.beforeStateVocabulary,
            thumbnailCopySuggestions: transitionResults.thumbnailCopySuggestions,
            engagementArchetypes: viralResults.engagementArchetypes,
            viralHookPrediction: viralResults.viralHookPrediction,
            audienceHealthScore: personaResults.healthScore,
            skillBreakdown: personaResults.skillBreakdown,
          },
        });

        return {
          status: "COMPLETE",
          isEmergency: deltaResults.isEmergency,
          velocity: deltaResults.velocity,
          tier,
        };
      });

      // 6. Billing usage is recorded when the scan is queued (POST /api/analyze)

      // 7. Agency newsroom (Node 7) — per-scan event
      const agencyUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { tier: true },
      });
      if (agencyUser?.tier === "AGENCY") {
        await step.sendEvent("trigger-newsroom", {
          name: "scan/newsroom.requested",
          data: { scanId, userId },
        });
      }

      // 8. Trigger Auto-Responder
      await step.sendEvent("trigger-auto-responder", {
        name: "scan/completed",
        data: {
          scanId,
          videoId: scan.videoId,
          userId,
        },
      });

      // 9. Deliver Webhooks
      await step.run("deliver-webhooks", async () => {
        const { deliverWebhook } = await import("@/lib/webhooks");
        await deliverWebhook(userId, "scan.completed", {
          scanId,
          videoId: scan.videoId,
          status: "COMPLETE"
        });

        if (reducerResults?.isEmergency) {
          await deliverWebhook(userId, "alert.emergency", {
            scanId,
            videoId: scan.videoId,
            velocity: reducerResults.velocity
          });
        }
      });

      // Safety net if a retry left results on a RUNNING row
      await step.run("ensure-complete", async () => {
        const current = await prisma.scan.findUnique({ where: { id: scanId } });
        if (
          current?.status === "RUNNING" &&
          current.executiveSummary &&
          typeof current.executiveSummary === "object" &&
          !("error" in (current.executiveSummary as object))
        ) {
          await prisma.scan.update({
            where: { id: scanId },
            data: {
              status: "COMPLETE",
              progress: 1.0,
              completedAt: current.completedAt ?? new Date(),
            },
          });
        }
      });

      return { status: "COMPLETE" };
    } catch (err: unknown) {
      const message =
        (err instanceof Error && err.message) ||
        (typeof err === "object" && err !== null && "error" in err && (err as any).error?.message) ||
        (typeof err === "string" ? err : "Analysis pipeline failed");
      console.error(`Inngest function analyzeVideoFn failed:`, err);
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: "FAILED",
          progress: 1.0,
          completedAt: new Date(),
          executiveSummary: { error: message },
        },
      });
      throw err;
    }
  }
);
