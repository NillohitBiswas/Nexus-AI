import { createClient } from "@insforge/sdk";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { trackInsforgeCall } from "@/lib/usage/track";

export async function getServerInsforgeClient() {
  const cookieStore = await cookies();
  const token = cookieStore.get("insforge-token")?.value;

  const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || "";
  const insforgeAnonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "";

  const client = createClient({
    baseUrl: insforgeUrl,
    anonKey: insforgeAnonKey,
    isServerMode: true,
    edgeFunctionToken: token || undefined,
  });
  if (token) {
    client.setAccessToken(token);
  }
  return client;
}

export async function getCurrentUser() {
  const client = await getServerInsforgeClient();
  try {
    const { data, error } = await client.auth.getCurrentUser();
    trackInsforgeCall({ operation: "auth.getCurrentUser" });
    if (error || !data || !data.user) {
      return null;
    }

    const user = data.user;
    
    // Ensure user exists in our local Prisma database
    let dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          tier: "FREE",
        },
      });
      trackInsforgeCall({
        userId: dbUser.id,
        operation: "prisma.user.create",
      });
    }

    return dbUser;
  } catch (err) {
    console.error("Error fetching current user:", err);
    return null;
  }
}
