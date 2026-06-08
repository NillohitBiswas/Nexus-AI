import { prisma } from "@/lib/db";

/**
 * Tier limits for Nexus Insights.
 * FREE (2 scans/mo, 100 comments/scan, 10 replies/mo)
 * CREATOR (unlimited scans, 500 comments, 500 replies)
 * GROWTH (2,000 comments, 2,000 replies)
 * AGENCY (unlimited)
 */

export interface TierLimits {
  maxScansPerMonth: number;
  maxCommentsPerScan: number;
  maxRepliesPerMonth: number;
}

export const TIER_LIMITS: Record<string, TierLimits> = {
  FREE: {
    maxScansPerMonth: 2,
    maxCommentsPerScan: 100,
    maxRepliesPerMonth: 10,
  },
  CREATOR: {
    maxScansPerMonth: Infinity,
    maxCommentsPerScan: 500,
    maxRepliesPerMonth: 500,
  },
  GROWTH: {
    maxScansPerMonth: Infinity,
    maxCommentsPerScan: 2000,
    maxRepliesPerMonth: 2000,
  },
  AGENCY: {
    maxScansPerMonth: Infinity,
    maxCommentsPerScan: Infinity,
    maxRepliesPerMonth: Infinity,
  },
};

/**
 * Simple in-memory cache for tier lookups.
 * In production this should use Upstash Redis with 5-min TTL.
 * Using a Map here for zero-dependency local development.
 */
const tierCache = new Map<string, { tier: string; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidateUserTierCache(userId: string): void {
  tierCache.delete(userId);
}

export async function getUserTier(userId: string): Promise<string> {
  const cached = tierCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.tier;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  });

  const tier = user?.tier || "FREE";
  tierCache.set(userId, { tier, cachedAt: Date.now() });
  return tier;
}

export function getLimits(tier: string): TierLimits {
  return TIER_LIMITS[tier] || TIER_LIMITS.FREE;
}

/**
 * Get current month's usage counts for a user.
 */
export async function getMonthlyUsage(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [scanCount, replyCount] = await Promise.all([
    prisma.usageRecord.count({
      where: {
        userId,
        type: "SCAN",
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.usageRecord.count({
      where: {
        userId,
        type: "REPLY",
        createdAt: { gte: startOfMonth },
      },
    }),
  ]);

  return { scanCount, replyCount };
}

export type GateCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string; code: "UPGRADE_REQUIRED" | "QUOTA_EXCEEDED" };

/**
 * Check if user can perform a scan.
 */
export async function canScan(userId: string): Promise<GateCheckResult> {
  const tier = await getUserTier(userId);
  const limits = getLimits(tier);
  const usage = await getMonthlyUsage(userId);

  if (limits.maxScansPerMonth !== Infinity && usage.scanCount >= limits.maxScansPerMonth) {
    return {
      allowed: false,
      reason: `You have used ${usage.scanCount}/${limits.maxScansPerMonth} scans this month. Upgrade to unlock more.`,
      code: "UPGRADE_REQUIRED",
    };
  }

  return { allowed: true };
}

/**
 * Check if user can post auto-replies.
 */
export async function canReply(userId: string): Promise<GateCheckResult> {
  const tier = await getUserTier(userId);
  const limits = getLimits(tier);
  const usage = await getMonthlyUsage(userId);

  if (limits.maxRepliesPerMonth !== Infinity && usage.replyCount >= limits.maxRepliesPerMonth) {
    return {
      allowed: false,
      reason: `You have used ${usage.replyCount}/${limits.maxRepliesPerMonth} auto-replies this month. Upgrade to unlock more.`,
      code: "QUOTA_EXCEEDED",
    };
  }

  return { allowed: true };
}

/**
 * Get max comments allowed for a scan based on user tier.
 */
export async function getCommentLimit(userId: string): Promise<number> {
  const tier = await getUserTier(userId);
  const limits = getLimits(tier);
  return limits.maxCommentsPerScan === Infinity ? 99999 : limits.maxCommentsPerScan;
}

/**
 * Purge old FREE-tier scans (older than 14 days).
 * Intended to be called from a monthly cron job.
 */
export async function purgeFreeScans(): Promise<number> {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // Find FREE users
  const freeUsers = await prisma.user.findMany({
    where: { tier: "FREE" },
    select: { id: true },
  });

  const freeUserIds = freeUsers.map((u) => u.id);
  if (freeUserIds.length === 0) return 0;

  // Find scans belonging to free users via channel -> video -> scan
  const oldScans = await prisma.scan.findMany({
    where: {
      video: {
        channel: {
          userId: { in: freeUserIds },
        },
      },
      completedAt: { lt: cutoff },
    },
    select: { id: true },
  });

  if (oldScans.length === 0) return 0;

  const scanIds = oldScans.map((s) => s.id);

  // Delete scan themes and news correlations first
  await prisma.scanTheme.deleteMany({ where: { scanId: { in: scanIds } } });
  await prisma.newsCorrelation.deleteMany({ where: { scanId: { in: scanIds } } });
  const { count } = await prisma.scan.deleteMany({ where: { id: { in: scanIds } } });

  return count;
}
