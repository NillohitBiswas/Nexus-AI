"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import { loginAction, resendVerificationEmailAction, verifyEmailAction } from "../actions/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const status = searchParams.get("insforge_status");
  const authType = searchParams.get("insforge_type");
  const authError = searchParams.get("insforge_error");

  useEffect(() => {
    if (status === "success" && authType === "verify_email") {
      startTransition(() => {
        setNotice("Email verified successfully. Sign in with your email and password.");
        setError(null);
      });
      return;
    }
    if (status === "error" && authType === "verify_email") {
      startTransition(() => {
        setError(authError || "Email verification link failed. Request a new verification email.");
        setNotice(null);
      });
    }
  }, [status, authType, authError]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        router.push(redirectTo);
        router.refresh();
      }
    });
  };

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await verifyEmailAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    });
  };

  const handleResend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await resendVerificationEmailAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setNotice(result?.message || "Verification email sent.");
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 py-12 text-zinc-100 sm:px-6 lg:px-8">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-40%] left-[20%] w-150 h-150 rounded-full bg-red-600/5 blur-[120px]" />
        <div className="absolute bottom-[-30%] right-[10%] w-125 h-125 rounded-full bg-red-950/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md space-y-8 z-10">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-tr from-red-600 to-red-950 border border-red-500/30 shadow-lg shadow-red-950/20">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
            Welcome back to Nexus
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-405">
            AI-powered YouTube comment intelligence
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-900 bg-zinc-950/40 p-8 shadow-2xl backdrop-blur-xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-450">
                {error}
              </div>
            )}
            {notice && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-350">
                {notice}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                Email address
              </label>
              <div className="mt-1">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isPending}
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                Password
              </label>
              <div className="mt-1 relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={isPending}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <Button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  variant="ghost"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={isPending}
                variant="primary"
                className="flex w-full justify-center rounded-xl bg-linear-to-r from-red-600 to-red-800 py-3 text-sm font-semibold text-white shadow-lg hover:from-red-550 hover:to-red-750 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 transition-all active:scale-[0.98]"
                isLoading={isPending}
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6 rounded-xl border border-zinc-900 bg-black/45 p-4">
            <p className="text-[11px] text-zinc-500">
              Didn&apos;t get access token after sign-in? Verify email first:
            </p>
            <form className="mt-3 space-y-3" onSubmit={handleVerify}>
              <Input
                name="email"
                type="email"
                required
                disabled={isPending}
                placeholder="Email used during signup"
              />
              <Input
                name="otp"
                type="text"
                required
                disabled={isPending}
                placeholder="6-digit verification code"
              />
              <Button
                type="submit"
                disabled={isPending}
                variant="secondary"
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
                isLoading={isPending}
              >
                Verify Code & Continue
              </Button>
            </form>
            <form className="mt-3" onSubmit={handleResend}>
              <Input
                name="email"
                type="email"
                required
                disabled={isPending}
                placeholder="Resend verification email to..."
              />
              <Button
                type="submit"
                disabled={isPending}
                variant="secondary"
                className="mt-2 w-full rounded-lg border border-zinc-850 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"
              >
                Resend Verification Email
              </Button>
            </form>
          </div>

            <div className="mt-6 flex items-center justify-between text-xs text-zinc-400">
            <span>Don&apos;t have an account?</span>
            <Link href="/signup" className="font-semibold text-red-500 hover:text-red-400">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
