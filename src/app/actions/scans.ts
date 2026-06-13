"use server";

import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { inngest } from "@/inngest/client";

export async function retryScanAction(scanId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { video: { include: { channel: true } } },
  });

  if (!scan) {
    return { error: "Scan not found" };
  }

  if (scan.video.channel.userId !== user.id) {
    return { error: "Forbidden" };
  }

  if (scan.status !== "FAILED") {
    return { error: "Only failed scans can be retried" };
  }

  await prisma.scan.update({
    where: { id: scanId },
    data: {
      status: "PENDING",
      progress: 0,
      executiveSummary: Prisma.JsonNull,
      completedAt: null,
    },
  });

  await inngest.send({
    name: "scan/analyze.requested",
    data: {
      videoId: scan.videoId,
      userId: user.id,
      scanId: scan.id,
    },
  });

  return { success: true, scanId: scan.id };
}
