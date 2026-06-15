"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

function generateApiToken(): string {
  return `nxs_${crypto.randomBytes(24).toString("hex")}`;
}

export async function saveBYOKCredentials(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Tier check removed to allow BYOK for all tiers

  const youtubeApiKey = formData.get("youtubeApiKey")?.toString().trim() || "";
  if (!youtubeApiKey) throw new Error("YouTube API Key is required.");

  try {
    const payload = JSON.stringify({ youtubeApiKey });
    const encryptedCredentials = encrypt(payload);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        byokEnabled: true,
        credentials: encryptedCredentials,
      },
    });

    revalidatePath("/settings");
  } catch (error: any) {
    console.error("Failed to save BYOK credentials:", error);
    throw new Error("Failed to encrypt and save credentials.");
  }
}

export async function rotateApiToken(): Promise<{ token: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (user.tier !== "AGENCY") throw new Error("API keys are Agency-only.");

  const token = generateApiToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { apiToken: token },
  });
  revalidatePath("/settings");
  return { token };
}

export async function saveWebhookUrl(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (user.tier !== "AGENCY") throw new Error("Webhooks are Agency-only.");

  const webhookUrl = formData.get("webhookUrl")?.toString().trim() || "";
  if (webhookUrl && !webhookUrl.startsWith("https://")) {
    throw new Error("Webhook URL must use HTTPS");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { webhookUrl: webhookUrl || null },
  });
  revalidatePath("/settings");
}

export async function disableBYOK(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        byokEnabled: false,
        credentials: null,
      },
    });

    revalidatePath("/settings");
  } catch (error: any) {
    console.error("Failed to disable BYOK:", error);
    throw new Error("Failed to disable BYOK.");
  }
}

export async function disconnectChannel(channelId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const channel = await prisma.channel.findFirst({
    where: {
      id: channelId,
      userId: user.id,
    },
  });

  if (!channel) {
    throw new Error("Channel not found or unauthorized.");
  }

  try {
    // Soft disconnect: unlink the channel from the user and clear OAuth tokens.
    // All videos, scans, and analyzed data are preserved.
    await prisma.channel.update({
      where: { id: channel.id },
      data: {
        userId: null,
        youtubeAccessToken: null,
        youtubeRefreshToken: null,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/analyzer");
  } catch (error: any) {
    console.error("Failed to disconnect channel:", error);
    throw new Error("Failed to disconnect channel: " + error.message);
  }
}

