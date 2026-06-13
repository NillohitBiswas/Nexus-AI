"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { invalidateUserTierCache } from "@/lib/billing/gates";
import { canUseDevTierSwitcher, isValidTier } from "@/lib/dev-tools";
import { prisma } from "@/lib/db";

export async function setDevTierAction(tier: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }
  if (!canUseDevTierSwitcher(user.email)) {
    return { error: "Dev tier switcher is not enabled for this account." };
  }
  if (!isValidTier(tier)) {
    return { error: "Invalid tier." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { tier },
  });
  invalidateUserTierCache(user.id);

  revalidatePath("/settings");
  revalidatePath("/analyzer");
  revalidatePath("/dev/usage");

  return { success: true, tier };
}
