"use client";

import { Button } from "./ui/Button";
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
    <div className="fixed bottom-6 right-6 z-50 max-w-md card p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm text-zinc-300">
            We use essential cookies for auth and optional analytics. See our {" "}
            <Link href="/privacy" className="text-red-400 underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="w-32">
          <Button
            type="button"
            onClick={() => {
              localStorage.setItem("nexus-cookie-consent", "1");
              setVisible(false);
            }}
            className="w-full"
            variant="primary"
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
