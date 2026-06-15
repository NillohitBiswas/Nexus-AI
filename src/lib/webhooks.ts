import crypto from 'crypto';
import { prisma } from '@/lib/db';

export type WebhookEvent = 'scan.completed' | 'alert.emergency' | 'reply.posted';

export async function deliverWebhook(userId: string, event: WebhookEvent, payload: unknown) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { webhookUrl: true, apiToken: true, tier: true }
    });

    // Only AGENCY users get webhooks
    if (!user || user.tier !== "AGENCY" || !user.webhookUrl) {
      return false;
    }

    // Prepare payload
    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload
    });

    // Calculate HMAC-SHA256 signature using the user's apiToken as the secret
    // If no apiToken exists, we skip signing (or skip delivery)
    const secret = user.apiToken || "default_secret";
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

    // Deliver via fetch
    const response = await fetch(user.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nexus-Signature': signature,
        'X-Nexus-Event': event
      },
      body,
    });

    if (!response.ok) {
      console.error(`Webhook delivery failed for ${user.webhookUrl} with status ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Exception during webhook delivery:`, error);
    return false;
  }
}
