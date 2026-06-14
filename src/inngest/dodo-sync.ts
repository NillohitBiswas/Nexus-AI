import { inngest } from "./client";
import { prisma } from "@/lib/db";

export const dodoUsageSyncFn = inngest.createFunction(
  { 
    id: "dodo-usage-sync",
    triggers: [{ cron: "0 * * * *" }] // Run every hour
  },
  async ({ step }) => {
    // 1. Find all unreported usage records
    const unreportedRecords = await step.run("fetch-unreported", async () => {
      return await prisma.usageRecord.findMany({
        where: { reported: false },
        include: { user: true }
      });
    });

    if (unreportedRecords.length === 0) {
      return { status: "NO_RECORDS" };
    }

    // 2. Group by user
    const userUsage = unreportedRecords.reduce((acc: Record<string, { records: any[], totalQuantity: number }>, record: any) => {
      if (!acc[record.userId]) {
        acc[record.userId] = { records: [], totalQuantity: 0 };
      }
      acc[record.userId].records.push(record);
      acc[record.userId].totalQuantity += record.quantity;
      return acc;
    }, {} as Record<string, { records: any[], totalQuantity: number }>);

    // 3. Report usage to Dodo Payments per user
    await step.run("report-to-dodo", async () => {
      for (const [userId, data] of Object.entries(userUsage) as [string, { records: any[], totalQuantity: number }][]) {
        // Find user's active Dodo subscription
        const subscription = await prisma.subscription.findFirst({
          where: { 
            userId, 
            provider: "DODO",
            status: "active" 
          }
        });

        if (subscription && process.env.DODO_API_KEY) {
          try {
            // Call Dodo Payments API to report usage
            // Format depends on Dodo API, assuming POST /v1/subscriptions/{id}/usage
            const res = await fetch(`https://api.dodopayments.com/v1/subscriptions/${subscription.subscriptionId}/usage`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.DODO_API_KEY}`
              },
              body: JSON.stringify({
                quantity: data.totalQuantity,
                timestamp: new Date().toISOString()
              })
            });

            if (res.ok) {
              // Mark as reported
              await prisma.usageRecord.updateMany({
                where: { id: { in: data.records.map(r => r.id) } },
                data: { reported: true }
              });
            } else {
              console.error(`Failed to report usage for sub ${subscription.subscriptionId}`);
            }
          } catch (e) {
            console.error(`Error reporting usage to Dodo for sub ${subscription.subscriptionId}`, e);
          }
        }
      }
    });

    return { status: "COMPLETE", processedUsers: Object.keys(userUsage).length };
  }
);
