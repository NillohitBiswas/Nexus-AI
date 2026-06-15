import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import Razorpay from "razorpay";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Use x-vercel-ip-country header if deployed on Vercel, else default to IN for local testing
  const country = request.headers.get("x-vercel-ip-country") || "IN";

  try {
    const { planId } = await request.json(); // CREATOR | GROWTH | AGENCY

    if (country === "IN") {
      // Razorpay Flow for Indian Users
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return NextResponse.json({ error: "Razorpay credentials not configured" }, { status: 500 });
      }

      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const rzpPlanId =
        planId === "AGENCY"
          ? process.env.RAZORPAY_AGENCY_PLAN_ID
          : planId === "GROWTH"
            ? process.env.RAZORPAY_GROWTH_PLAN_ID
            : process.env.RAZORPAY_CREATOR_PLAN_ID;

      if (!rzpPlanId) {
        return NextResponse.json({ error: "Requested plan ID is not configured" }, { status: 400 });
      }

      const subscription = await razorpay.subscriptions.create({
        plan_id: rzpPlanId,
        customer_notify: 1,
        total_count: 12, // Default 1 year total billing cycles for recurring
        notes: {
          userId: user.id
        }
      });

      return NextResponse.json({
        provider: "RAZORPAY",
        subscriptionId: subscription.id,
        keyId: process.env.RAZORPAY_KEY_ID
      });
    } else {
      // Dodo Payments Flow for International Users (Phase 3.1)
      if (!process.env.DODO_API_KEY) {
        return NextResponse.json({ error: "Dodo Payments credentials not configured" }, { status: 500 });
      }

      const dodoPlanId =
        planId === "AGENCY"
          ? process.env.DODO_AGENCY_PLAN_ID
          : planId === "GROWTH"
            ? process.env.DODO_GROWTH_PLAN_ID
            : process.env.DODO_CREATOR_PLAN_ID;

      if (!dodoPlanId) {
        return NextResponse.json({ error: "Requested plan ID is not configured for Dodo" }, { status: 400 });
      }

      // Create a checkout session using Dodo Payments API
      const dodoRes = await fetch("https://api.dodopayments.com/v1/checkout-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.DODO_API_KEY}`
        },
        body: JSON.stringify({
          plan_id: dodoPlanId,
          metadata: {
            userId: user.id
          },
          success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/analyzer?success=true`,
          cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/analyzer?canceled=true`
        })
      });

      if (!dodoRes.ok) {
        const errorData = await dodoRes.json();
        throw new Error(errorData.message || "Failed to create Dodo Payments session");
      }

      const session = await dodoRes.json();

      return NextResponse.json({
        provider: "DODO",
        checkoutUrl: session.url
      });
    }

  } catch (err: unknown) {
    console.error("Checkout route error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
