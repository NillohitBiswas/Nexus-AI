import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !secret) {
      return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(bodyText)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(bodyText);

    // Handle subscription authentication / creation / renewal
    if (event.event === "subscription.charged" || event.event === "subscription.authenticated") {
      const subscription = event.payload.subscription.entity;
      const userId = subscription.notes?.userId;

      if (userId) {
        // Upgrade user tier based on plan ID
        const { tierFromRazorpayPlan } = await import("@/lib/billing/tier-from-plan");
        const newTier = tierFromRazorpayPlan(subscription.plan_id);

        await prisma.user.update({
          where: { id: userId },
          data: { tier: newTier }
        });

        // Store or update Subscription record
        const subscriptionIdStr = String(subscription.id);
        const existingSub = await prisma.subscription.findFirst({
          where: { subscriptionId: subscriptionIdStr }
        });

        if (existingSub) {
          await prisma.subscription.update({
            where: { id: existingSub.id },
            data: {
              status: subscription.status,
              currentPeriodEnd: new Date(subscription.current_end * 1000)
            }
          });
        } else {
          await prisma.subscription.create({
            data: {
              userId,
              provider: "RAZORPAY",
              subscriptionId: subscriptionIdStr,
              status: subscription.status,
              currentPeriodEnd: new Date(subscription.current_end * 1000)
            }
          });
        }
      }
    } 
    // Handle subscription cancellation or failure
    else if (event.event === "subscription.cancelled" || event.event === "subscription.halted") {
      const subscription = event.payload.subscription.entity;
      const userId = subscription.notes?.userId;

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
            data: { status: subscription.status }
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Razorpay webhook error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
