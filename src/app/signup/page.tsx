"use client";

import React, { useState, useTransition } from "react";
import { signupAction } from "../actions/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    startTransition(async () => {
      const result = await signupAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        if (result?.message) {
          setSuccessMessage(result.message);
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      }
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
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-405">
            Start scanning and auto-replying with intelligence
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-900 bg-zinc-950/40 p-8 shadow-2xl backdrop-blur-xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                {error}
              </div>
            )}
            
            {successMessage && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
                {successMessage}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-300">
                Full Name (Optional)
              </label>
              <div className="mt-1">
                <Input
                  id="name"
                  name="name"
                  type="text"
                  disabled={isPending}
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-350">
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
              <label htmlFor="password" className="block text-sm font-medium text-zinc-350">
                Password
              </label>
              <div className="mt-1 relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
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
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-350">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={isPending}
                  placeholder="••••••••"
                  className="pr-10"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={isPending}
                variant="primary"
                className="flex w-full justify-center rounded-xl py-3 text-sm font-semibold shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                isLoading={isPending}
              >
                Create account
              </Button>
            </div>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-zinc-400">
            <span>Already have an account?</span>
            <Link href="/login" className="font-semibold text-red-500 hover:text-red-400">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
