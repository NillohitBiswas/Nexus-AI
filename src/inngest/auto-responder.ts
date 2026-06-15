import { inngest } from "./client";
import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import { groqChatCompletion } from "@/lib/ai/groq-client";
import { GROQ_MODEL_FAST } from "@/lib/ai/groq-models";

// Phase 4.2: Trigger Hierarchy & Reply Drafts
export const autoResponderDrafterFn = inngest.createFunction(
  {
    id: "auto-responder-drafter",
    triggers: [{ event: "scan/completed" }],
  },
  async ({ event, step }) => {
    const { videoId, userId, scanId } = event.data;

    // Fetch the scan and its associated video/channel details
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { video: { include: { channel: true } } },
    });

    if (!scan) {
      throw new Error(`Scan with ID ${scanId} not found`);
    }

    // Fetch active rules for the user
    const rules = await prisma.responseRule.findMany({
      where: { userId, isActive: true },
    });

    if (rules.length === 0) {
      console.log(`No active response rules found for user ${userId}. Skipping auto-responder drafting.`);
      return { status: "SKIPPED", reason: "NO_ACTIVE_RULES" };
    }

    // Check tier limits for replies
    const { canReply } = await import("@/lib/billing/gates");
    const replyGate = await canReply(userId);
    if (!replyGate.allowed) {
      console.log(`User ${userId} reached auto-reply limit: ${replyGate.reason}`);
      return { status: "SKIPPED", reason: replyGate.code };
    }

    // Fetch all comments imported in this scan
    const comments = await prisma.commentIntelligence.findMany({
      where: { videoId: scan.video.id },
    });

    let draftsCreated = 0;
    let commentsExcluded = 0;

    for (const comment of comments) {
      // 1. Skip if draft already exists for this comment
      const existingLog = await prisma.responseLog.findFirst({
        where: { commentId: comment.id },
      });
      if (existingLog) continue;

      // 2. Fetch commenter status to check for isSuperFan
      const commenter = await prisma.channelCommenter.findFirst({
        where: {
          channelId: scan.video.channelId,
          authorChannelId: comment.authorChannelId,
        },
      });

      // Exclude if author is marked as a superFan (requires manual reply)
      if (commenter?.isSuperFan) {
        commentsExcluded++;
        continue;
      }

      // Exclude if flagged by SUPPRESSOR (anomaly, spam, extreme negativity)
      const isSuppressor =
        comment.category === "SPAM" ||
        comment.category === "ABUSE" ||
        (comment.sentiment !== null && comment.sentiment < -0.8 && comment.intensity !== null && comment.intensity > 8);

      if (isSuppressor) {
        commentsExcluded++;
        continue;
      }

      // 3. Evaluate 5-level Priority Queue
      let bestRule = null;
      let bestPriority = 6; // 1 = P1 (Keywords), 2 = P2 (VIP Loyalty), 3 = P3 (Leads), 4 = P4 (Semantic Intent), 5 = P5 (Content Gap)

      for (const rule of rules) {
        // P1: Keywords
        const matchesKeyword = rule.keywords.some((kw) =>
          comment.rawText.toLowerCase().includes(kw.toLowerCase())
        );
        if (matchesKeyword) {
          if (bestPriority > 1) {
            bestRule = rule;
            bestPriority = 1;
          }
          continue;
        }

        // P2: VIP Loyalty (VIP returning commenter or loyalty risk)
        const isLoyaltyRisk =
          commenter &&
          commenter.sentimentHistory.length >= 2 &&
          commenter.sentimentHistory.reduce((a, b) => a + b, 0) / commenter.sentimentHistory.length < -0.2;
        if (isLoyaltyRisk) {
          if (bestPriority > 2) {
            bestRule = rule;
            bestPriority = 2;
          }
        }

        // P3: Leads (High score intent/category, buy/price indicators)
        const isLead =
          comment.intent?.toLowerCase().includes("buy") ||
          comment.intent?.toLowerCase().includes("price") ||
          comment.intent?.toLowerCase().includes("pricing") ||
          comment.intent?.toLowerCase().includes("cost") ||
          comment.intent?.toLowerCase().includes("purchase") ||
          (comment.category === "QUESTION" && comment.intensity !== null && comment.intensity >= 7);
        if (isLead) {
          if (bestPriority > 3) {
            bestRule = rule;
            bestPriority = 3;
          }
        }

        // P4: Semantic Intent matching rule intents
        const matchesIntent = rule.intents.some((intent) =>
          comment.intent?.toLowerCase().includes(intent.toLowerCase())
        );
        if (matchesIntent) {
          if (bestPriority > 4) {
            bestRule = rule;
            bestPriority = 4;
          }
        }

        // P5: Content Gap
        if (comment.isContentGap) {
          if (bestPriority > 5) {
            bestRule = rule;
            bestPriority = 5;
          }
        }
      }

      // If a rule matches, draft a response using Llama 3 8B
      if (bestRule) {
        const draftText = await step.run(`draft-reply-${comment.id}`, async () => {
          const systemPrompt = `You are an expert community manager who writes highly empathetic, personalized, and tone-mirrored replies to YouTube comments.
Your goal is to draft a reply that conforms to a specific template, matches the commenter's tone, and is extremely engaging and helpful.
Do not use generic corporate platitudes. Empathize with their specific situation (e.g., if they are frustrated, be warm and helpful; if they are excited, match their excitement).

Template: ${bestRule!.template}
Commenter Name: ${comment.authorName}
Comment Text: ${comment.rawText}
Comment Category: ${comment.category || "General"}
Comment Intent: ${comment.intent || "General"}

Draft the final response text, replacing any templates or custom placeholder details logically based on the comment's intent. Output the drafted response and nothing else. No preamble, no quotes, no markdown wrapper. Just the raw response text.`;

          const completion = await groqChatCompletion(
            {
              messages: [{ role: "user", content: systemPrompt }],
              model: GROQ_MODEL_FAST,
              temperature: 0.7,
            },
            { userId, operation: "auto_reply.draft" },
          );

          return (completion.choices[0]?.message?.content || "").trim().replace(/^"(.*)"$/, "$1");
        });

        // Run Llama Guard check
        const isSafe = await step.run(`safety-check-${comment.id}`, async () => {
          try {
            const guardCompletion = await groqChatCompletion(
              {
                model: "llama-guard-3-8b",
                messages: [{ role: "user", content: draftText }],
              },
              { userId, operation: "auto_reply.guard" },
            );
            const guardResult = guardCompletion.choices[0]?.message?.content || "";
            return !guardResult.toLowerCase().includes("unsafe");
          } catch (err) {
            console.error("Llama Guard check failed, falling back to local heuristic:", err);
            const containsBadWords = /fuck|shit|asshole|bitch|scam|spam/i.test(draftText);
            return !containsBadWords;
          }
        });

        // Jitter Queue: VIP/Leads (P2/P3) scheduled in 2-5 mins; others in 5-20 mins
        const isFastTrack = bestPriority === 2 || bestPriority === 3;
        const minJitter = isFastTrack ? 2 : 5;
        const maxJitter = isFastTrack ? 5 : 20;
        const jitterMinutes = Math.floor(Math.random() * (maxJitter - minJitter + 1)) + minJitter;
        const scheduledAt = new Date(Date.now() + jitterMinutes * 60 * 1000);

        // Store draft response log
        await prisma.responseLog.create({
          data: {
            ruleId: bestRule!.id,
            commentId: comment.id,
            draftText,
            status: isSafe ? "PENDING" : "BLOCKED_BY_GUARD",
            scheduledAt,
          },
        });

        draftsCreated++;
      }
    }

    return { status: "COMPLETED", draftsCreated, commentsExcluded };
  }
);

// Helper function to refresh access token
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not fully configured on the server.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error_description || err.error || "Failed to refresh YouTube access token");
  }

  const data = await res.json();
  return data.access_token;
}

// Helper to post YouTube comment reply
async function postYouTubeCommentReply(commentId: string, text: string, accessToken: string): Promise<string> {
  const url = "https://www.googleapis.com/youtube/v3/comments?part=snippet";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snippet: {
        parentId: commentId,
        textOriginal: text,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "YouTube API comment insert failed");
  }

  const data = await res.json();
  return data.id;
}

// Phase 4.3: Safety Guard & Flusher
export const replyFlusherFn = inngest.createFunction(
  {
    id: "reply-flusher",
    // Cron trigger to run every minute
    concurrency: { limit: 1 },
    triggers: [{ cron: "* * * * *" }],
  },
  async ({ step }) => {
    // Find all pending logs whose scheduled time has arrived
    const pendingLogs = await prisma.responseLog.findMany({
      where: {
        status: "PENDING",
        scheduledAt: { lte: new Date() },
      },
      include: {
        rule: true,
      },
    });

    if (pendingLogs.length === 0) {
      return { status: "NO_PENDING_REPLIES" };
    }

    let processedCount = 0;

    for (const log of pendingLogs) {
      await step.run(`flush-reply-${log.id}`, async () => {
        // Check tier limits
        const { canReply } = await import("@/lib/billing/gates");
        const replyGate = await canReply(log.rule.userId);
        if (!replyGate.allowed) {
          console.log(`User ${log.rule.userId} reached auto-reply limit. Marking log ${log.id} as FAILED_QUOTA.`);
          await prisma.responseLog.update({
            where: { id: log.id },
            data: { status: "FAILED" }, // Could add a dedicated FAILED_QUOTA status if schema allowed
          });
          return;
        }

        // Update status to POSTING
        await prisma.responseLog.update({
          where: { id: log.id },
          data: { status: "POSTING" },
        });

        const comment = await prisma.commentIntelligence.findUnique({
          where: { id: log.commentId },
          include: { video: { include: { channel: true } } },
        });

        if (!comment || !comment.video.channel) {
          await prisma.responseLog.update({
            where: { id: log.id },
            data: { status: "FAILED" },
          });
          return;
        }

        const channel = comment.video.channel;
        let accessToken = "";
        let refreshToken = "";

        if (channel.youtubeAccessToken) {
          try {
            accessToken = decrypt(channel.youtubeAccessToken);
          } catch (e) {
            console.error("Failed to decrypt access token:", e);
          }
        }

        if (channel.youtubeRefreshToken) {
          try {
            refreshToken = decrypt(channel.youtubeRefreshToken);
          } catch (e) {
            console.error("Failed to decrypt refresh token:", e);
          }
        }

        // Handle offline/mock testing gracefully
        const isMockMode =
          !accessToken ||
          accessToken.includes("<PLACEHOLDER") ||
          process.env.NODE_ENV !== "production";

        if (isMockMode) {
          console.log(`[MOCK POST] Replying to comment ${comment.youtubeCommentId} with: "${log.draftText}"`);
          const mockReplyId = `reply_${Math.random().toString(36).substring(2, 11)}`;
          
          await prisma.responseLog.update({
            where: { id: log.id },
            data: {
              status: "POSTED",
              postedAt: new Date(),
              youtubeReplyId: mockReplyId,
            },
          });

          // Write a billing usage record for the reply
          await prisma.usageRecord.create({
            data: {
              userId: log.rule.userId,
              type: "REPLY",
              quantity: 1,
            },
          });

          processedCount++;
          return;
        }

        // Real integration mode
        try {
          let replyId = "";
          try {
            replyId = await postYouTubeCommentReply(comment.youtubeCommentId, log.draftText, accessToken);
          } catch (apiErr: unknown) {
            // If 401/expired, try refreshing once
            const _apiErrMessage =
              apiErr instanceof Error
                ? apiErr.message
                : typeof apiErr === "string"
                ? apiErr
                : JSON.stringify(apiErr);
            if (_apiErrMessage.includes("Unauthorized") || _apiErrMessage.includes("invalid_grant") || refreshToken) {
              console.log("Access token expired, attempting to refresh token...");
              const newAccessToken = await refreshAccessToken(refreshToken);
              const newEncryptedToken = encrypt(newAccessToken);
              
              await prisma.channel.update({
                where: { id: channel.id },
                data: { youtubeAccessToken: newEncryptedToken },
              });

              // Retry post comment reply
              replyId = await postYouTubeCommentReply(comment.youtubeCommentId, log.draftText, newAccessToken);
            } else {
              throw apiErr;
            }
          }

          // Successfully posted
          await prisma.responseLog.update({
            where: { id: log.id },
            data: {
              status: "POSTED",
              postedAt: new Date(),
              youtubeReplyId: replyId,
            },
          });

          // Record usage record
          await prisma.usageRecord.create({
            data: {
              userId: log.rule.userId,
              type: "REPLY",
              quantity: 1,
            },
          });

          // Deliver Webhook
          const { deliverWebhook } = await import("@/lib/webhooks");
          await deliverWebhook(log.rule.userId, "reply.posted", {
            commentId: log.commentId,
            replyId,
            text: log.draftText,
            ruleId: log.ruleId
          });

          processedCount++;
        } catch (postErr: unknown) {
          const _postErrMessage =
            postErr instanceof Error ? postErr.message : typeof postErr === "string" ? postErr : JSON.stringify(postErr);
          console.error(`Failed to post reply for log ${log.id}:`, _postErrMessage);
          await prisma.responseLog.update({
            where: { id: log.id },
            data: { status: "FAILED" },
          });
        }
      });
    }

    return { status: "COMPLETED", processedCount };
  }
);
