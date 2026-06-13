import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const signature = request.headers.get("x-dodo-signature") || request.headers.get("authorization");
    const secret = process.env.DODO_WEBHOOK_SECRET;

    if (!signature || !secret) {
      return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
    }

    // Verify Dodo signature
    // This is a generic HMAC verification. Check Dodo documentation for exact signature header format
    const signaturePart = signature.replace("Bearer ", "");
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(bodyText)
      .digest("hex");

    // Some webhook verifications might differ, but assuming standard HMAC for now
    if (expectedSignature !== signaturePart) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(bodyText);

    // Common Dodo events: subscription.created, subscription.updated, subscription.canceled
    if (event.type === "subscription.created" || event.type === "subscription.updated") {
      const subscription = event.data;
      const userId = subscription.metadata?.userId;

      if (userId) {
        // Upgrade user tier based on plan ID
        const { tierFromDodoPlan } = await import("@/lib/billing/tier-from-plan");
        const newTier = tierFromDodoPlan(subscription.plan_id);

        await prisma.user.update({
          where: { id: userId },
          data: { tier: newTier }
        });

        // Store or update Subscription record
        const subscriptionIdStr = String(subscription.id);
        const existingSub = await prisma.subscription.findFirst({
          where: { subscriptionId: subscriptionIdStr }
        });

        const currentPeriodEnd = new Date(subscription.current_period_end || Date.now() + 30*24*60*60*1000);

        if (existingSub) {
          await prisma.subscription.update({
            where: { id: existingSub.id },
            data: {
              status: subscription.status,
              currentPeriodEnd
            }
          });
        } else {
          await prisma.subscription.create({
            data: {
              userId,
              provider: "DODO",
              subscriptionId: subscriptionIdStr,
              status: subscription.status || "active",
              currentPeriodEnd
            }
          });
        }
      }
    } 
    else if (event.type === "subscription.canceled") {
      const subscription = event.data;
      const userId = subscription.metadata?.userId;

      if (userId) {
        // Downgrade back to FREE tier
        await prisma.user.update({
          where: { id: userId },
          data: { tier: "FREE" }
        });

        const subscriptionIdStr = String(subscription.id);
        const existingSub = await prisma.subscription.findFirst({
          where: { subscriptionId: subscriptionIdStr }
        });

        if (existingSub) {
          await prisma.subscription.update({
            where: { id: existingSub.id },
            data: { status: "canceled" }
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Dodo webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
