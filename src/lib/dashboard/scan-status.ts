import { prisma } from "@/lib/db";

/** True when the scan has a usable analysis payload (not a bare error object). */
export function scanHasResults(scan: { executiveSummary?: unknown }): boolean {
  const summary = scan.executiveSummary;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return false;
  }
  const obj = summary as Record<string, unknown>;
  if ("error" in obj && !("executiveSummary" in obj) && !("topPainSignals" in obj)) {
    return false;
  }
  return (
    "executiveSummary" in obj ||
    "topPainSignals" in obj ||
    "personas" in obj ||
    "topDemandSignals" in obj
  );
}

export function isScanTerminal(status: string): boolean {
  return status === "COMPLETE" || status === "FAILED";
}

/**
 * Inngest retries can reset status to RUNNING after reduce-summary already wrote results.
 * Repair so dashboard pages and history stay consistent.
 */
export async function repairStuckScan(scanId: string) {
  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan || scan.status !== "RUNNING" || !scanHasResults(scan)) {
    return scan;
  }
  return prisma.scan.update({
    where: { id: scanId },
    data: {
      status: "COMPLETE",
      progress: 1.0,
      completedAt: scan.completedAt ?? new Date(),
    },
  });
}

export async function repairStuckScansForUser(userId: string) {
  const stuck = await prisma.scan.findMany({
    where: {
      status: "RUNNING",
      video: { channel: { userId } },
    },
    select: { id: true, executiveSummary: true },
  });
  const ids = stuck.filter((s) => scanHasResults(s)).map((s) => s.id);
  if (ids.length === 0) return 0;
  await prisma.scan.updateMany({
    where: { id: { in: ids } },
    data: { status: "COMPLETE", progress: 1.0, completedAt: new Date() },
  });
  return ids.length;
}
