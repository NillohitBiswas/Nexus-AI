"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type PlanId = "CREATOR" | "GROWTH" | "AGENCY";

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

export function CheckoutButton({
  planId,
  label,
  className = "",
}: {
  planId: PlanId;
  label: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");

      if (data.provider === "DODO" && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      if (data.provider === "RAZORPAY") {
        await loadRazorpayScript();
        const Razorpay = window.Razorpay;
        if (!Razorpay) throw new Error("Razorpay unavailable");

        const rzp = new Razorpay({
          key: data.keyId,
          subscription_id: data.subscriptionId,
          name: "Nexus Insights",
          description: `${planId} plan subscription`,
          handler: () => {
            window.location.href = "/analyzer?success=true";
          },
          modal: {
            ondismiss: () => setLoading(false),
          },
        });
        rzp.open();
        return;
      }

      throw new Error("Unknown payment provider");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className={
          className ||
          "w-full rounded-xl bg-red-600 hover:bg-red-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 transition-all active:scale-[0.98]"
        }
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </span>
        ) : (
          label
        )}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
