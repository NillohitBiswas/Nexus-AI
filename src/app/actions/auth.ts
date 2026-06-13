"use server";

import { createClient } from "@insforge/sdk";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || "";
const insforgeAnonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "";

function getAuthRedirectTo() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${siteUrl}/login`;
}

function getClient() {
  return createClient({
    baseUrl: insforgeUrl,
    anonKey: insforgeAnonKey,
    isServerMode: true,
  });
}

function getAccessToken(payload: any) {
  return (
    payload?.accessToken ||
    payload?.access_token ||
    payload?.session?.accessToken ||
    payload?.session?.access_token ||
    null
  );
}

function isUnverifiedUser(user: any) {
  const flags = [
    user?.emailVerified,
    user?.email_verified,
    user?.isEmailVerified,
    user?.verified,
  ];
  return flags.some((f) => f === false);
}

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const client = getClient();
  try {
    const { data, error } = (await client.auth.signInWithPassword({
      email,
      password,
    })) as any;

    if (error) {
      return { error: error.message || "Failed to sign in" };
    }

    const token = getAccessToken(data);
    if (!token) {
      if (isUnverifiedUser(data?.user)) {
        return { error: "Please verify your email first, then sign in." };
      }
      return { error: "Authentication incomplete. Please verify your email link/code, then try again." };
    }

    const cookieStore = await cookies();
    cookieStore.set("insforge-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    // Create user in local Prisma DB if not exists
    const user = data?.user;
    if (user) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          id: user.id,
          email: user.email,
          tier: "FREE",
        },
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("Login action error:", err);
    return { error: err.message || "An unexpected error occurred" };
  }
}

export async function signupAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const client = getClient();
  try {
    const { data, error } = (await client.auth.signUp({
      email,
      password,
      name: name || undefined,
      // Required for link-based email verification flows
      redirectTo: getAuthRedirectTo(),
    })) as any;

    if (error) {
      return { error: error.message || "Failed to sign up" };
    }

    // After signup, we automatically log the user in to get a session
    const loginRes = (await client.auth.signInWithPassword({
      email,
      password,
    })) as any;

    if (!loginRes.error) {
      const token = getAccessToken(loginRes.data);
      if (token) {
        const cookieStore = await cookies();
        cookieStore.set("insforge-token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: "/",
        });

        // Save in database
        const user = loginRes.data.user;
        if (user) {
          await prisma.user.upsert({
            where: { email: user.email },
            update: {},
            create: {
              id: user.id,
              email: user.email,
              tier: "FREE",
            },
          });
        }
        return { success: true };
      }
      if (isUnverifiedUser(loginRes.data?.user)) {
        return { success: true, message: "Account created. Verify your email from the link/code, then sign in." };
      }
    }

    return { success: true, message: "Account created. Please verify your email, then log in." };
  } catch (err: any) {
    console.error("Signup action error:", err);
    return { error: err.message || "An unexpected error occurred" };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("insforge-token");
  return { success: true };
}

export async function verifyEmailAction(formData: FormData) {
  const email = formData.get("email") as string;
  const otp = formData.get("otp") as string;

  if (!email || !otp) {
    return { error: "Email and verification code are required." };
  }

  const client = getClient();
  try {
    const { data, error } = (await client.auth.verifyEmail({
      email,
      otp,
    })) as any;

    if (error) {
      return { error: error.message || "Failed to verify email." };
    }

    const token = getAccessToken(data);

    if (!token) {
      return { error: "Email verified. Please sign in with your email and password." };
    }

    const cookieStore = await cookies();
    cookieStore.set("insforge-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    const user = data?.user;
    if (user?.email) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          id: user.id,
          email: user.email,
          tier: "FREE",
        },
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("Verify email action error:", err);
    return { error: err.message || "An unexpected error occurred" };
  }
}

export async function resendVerificationEmailAction(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) {
    return { error: "Email is required." };
  }

  const client = getClient();
  try {
    const payload: any = {
      email,
      redirectTo: getAuthRedirectTo(),
      options: {
        emailRedirectTo: getAuthRedirectTo(),
      },
    };
    const { error } = (await client.auth.resendVerificationEmail(payload)) as any;

    if (error) {
      return { error: error.message || "Failed to resend verification email." };
    }

    return { success: true, message: "Verification email sent. Check your inbox." };
  } catch (err: any) {
    console.error("Resend verification email action error:", err);
    return { error: err.message || "An unexpected error occurred" };
  }
}
