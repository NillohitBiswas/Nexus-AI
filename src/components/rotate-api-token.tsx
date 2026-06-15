"use client";

import { Button } from "./ui/Button";

import { useState } from "react";
import { rotateApiToken } from "@/app/actions/settings";
import { RefreshCw, Copy, Check } from "lucide-react";

export function RotateApiTokenButton() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            const { token: newToken } = await rotateApiToken();
            setToken(newToken);
          } catch (e) {
            alert(e instanceof Error ? e.message : "Failed");
          } finally {
            setLoading(false);
          }
        }}
        variant="secondary"
        className="flex items-center gap-2 px-4 py-2 rounded-xl"
        isLoading={loading}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Generating…" : "Generate New API Key"}
      </Button>

      {token && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">
            ✓ Copy now — shown only once
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-emerald-800 font-mono break-all bg-white border border-emerald-100 rounded-lg px-3 py-2">
              {token}
            </code>
            <Button
              type="button"
              onClick={handleCopy}
              variant="secondary"
              className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
