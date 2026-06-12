"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("nexus-cookie-consent")) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl md:left-auto md:right-4">
      <p className="text-sm text-zinc-300">
        We use essential cookies for auth and optional analytics. See our{" "}
        <Link href="/privacy" className="text-violet-400 underline">
          Privacy Policy
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem("nexus-cookie-consent", "1");
          setVisible(false);
        }}
        className="mt-3 w-full rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white"
      >
        Accept
      </button>
    </div>
  );
}
