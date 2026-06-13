"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canScan, getLimits, getMonthlyUsage, getUserTier } from "@/lib/billing/gates";
import { repairStuckScansForUser } from "@/lib/dashboard/scan-status";

export async function getDashboardData() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" as const };
  }

  const tier = await getUserTier(user.id);
  const limits = getLimits(tier);
  const usage = await getMonthlyUsage(user.id);
  const scanGate = await canScan(user.id);

  await repairStuckScansForUser(user.id);

  const [channels, scans] = await Promise.all([
    prisma.channel.findMany({
      where: { userId: user.id },
    }),
    prisma.scan.findMany({
      where: { video: { channel: { userId: user.id } } },
      include: { video: true },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  return {
    user,
    channels,
    scans,
    usage: {
      scansThisMonth: usage.scanCount,
      maxScansPerMonth: limits.maxScansPerMonth,
      canScan: scanGate.allowed,
      scanGateReason: scanGate.allowed ? null : scanGate.reason,
    },
  };
}

export async function getYoutubeOAuthUrl() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return { error: "Google client ID is not configured on the server." };
  }

  // Set the redirect URI to the local or production callback path
  // Since this is run on the server, we read the host from request headers or default to localhost
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const redirectUri = `${origin}/api/youtube/callback`;

  const scopes = [
    "https://www.googleapis.com/auth/youtube.readonly",
  ];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return { url };
}
