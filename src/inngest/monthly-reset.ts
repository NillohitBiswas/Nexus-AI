import { inngest } from "./client";
import { prisma } from "@/lib/db";
import { purgeFreeScans } from "@/lib/billing/gates";

/**
 * Phase 5.2: Monthly Quota Reset & FREE Tier Cleanup
 * Runs at midnight on the 1st of every month.
 *
 * 1. Resets all monthly usage counters (by deleting old UsageRecords).
 * 2. Purges FREE-tier scans older than 14 days.
 */
export const monthlyQuotaResetFn = inngest.createFunction(
  { 
    id: "monthly-quota-reset",
    triggers: [{ cron: "0 0 1 * *" }] // Midnight on 1st of each month
  },
  async ({ step }) => {
    // Step 1: Reset monthly usage (mark previous month records as stale)
    const resetResult = await step.run("reset-monthly-usage", async () => {
      // We don't delete old usage records (they serve as historical data).
      // The gate checks already filter by `createdAt >= startOfMonth`,
      // so resetting happens automatically by the calendar month boundary.
      // We just log the action.
      const now = new Date();
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const lastMonthCount = await prisma.usageRecord.count({
        where: {
          createdAt: {
            gte: startOfPrevMonth,
            lte: endOfPrevMonth,
          },
        },
      });

      console.log(`[Monthly Reset] Previous month had ${lastMonthCount} usage records. New month quotas are now active.`);
      return { previousMonthRecords: lastMonthCount };
    });

    // Step 2: Purge FREE-tier scans older than 14 days
    const purgeResult = await step.run("purge-free-scans", async () => {
      const purgedCount = await purgeFreeScans();
      console.log(`[Monthly Reset] Purged ${purgedCount} old FREE-tier scans.`);
      return { purgedScans: purgedCount };
    });

    return {
      status: "COMPLETE",
      ...resetResult,
      ...purgeResult,
    };
  }
);
