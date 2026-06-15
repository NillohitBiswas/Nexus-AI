import { prisma } from "@/lib/db";
import { repairStuckScansForUser } from "@/lib/dashboard/scan-status";

export async function getLatestScansForUser(userId: string, limit = 5) {
  await repairStuckScansForUser(userId);

  return prisma.scan.findMany({
    where: {
      video: { channel: { userId } },
      status: "COMPLETE",
    },
    include: {
      video: { include: { channel: true } },
      themes: true,
      newsCorrelations: true,
    },
    orderBy: { completedAt: "desc" },
    take: limit,
  });
}
