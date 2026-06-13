"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getRules() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  return await prisma.responseRule.findMany({
    where: { userId: user.id },
    orderBy: { id: "desc" },
  });
}

export async function createRule(formData: {
  keywords: string[];
  intents: string[];
  template: string;
  minIntensity: number;
  isActive: boolean;
}) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const rule = await prisma.responseRule.create({
    data: {
      userId: user.id,
      keywords: formData.keywords,
      intents: formData.intents,
      template: formData.template,
      minIntensity: formData.minIntensity,
      isActive: formData.isActive,
    },
  });

  revalidatePath("/rules");
  return rule;
}

export async function updateRule(
  id: string,
  formData: {
    keywords?: string[];
    intents?: string[];
    template?: string;
    minIntensity?: number;
    isActive?: boolean;
  }
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Ensure user owns the rule
  const existing = await prisma.responseRule.findUnique({
    where: { id },
  });

  if (!existing || existing.userId !== user.id) {
    throw new Error("Forbidden");
  }

  const rule = await prisma.responseRule.update({
    where: { id },
    data: {
      keywords: formData.keywords !== undefined ? formData.keywords : undefined,
      intents: formData.intents !== undefined ? formData.intents : undefined,
      template: formData.template !== undefined ? formData.template : undefined,
      minIntensity: formData.minIntensity !== undefined ? formData.minIntensity : undefined,
      isActive: formData.isActive !== undefined ? formData.isActive : undefined,
    },
  });

  revalidatePath("/rules");
  return rule;
}

export async function deleteRule(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Ensure user owns the rule
  const existing = await prisma.responseRule.findUnique({
    where: { id },
  });

  if (!existing || existing.userId !== user.id) {
    throw new Error("Forbidden");
  }

  // First delete response logs associated with the rule
  await prisma.responseLog.deleteMany({
    where: { ruleId: id },
  });

  await prisma.responseRule.delete({
    where: { id },
  });

  revalidatePath("/rules");
  return { success: true };
}

export async function getResponseLogs() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  return await prisma.responseLog.findMany({
    where: {
      rule: {
        userId: user.id,
      },
    },
    include: {
      rule: true,
    },
    orderBy: {
      scheduledAt: "desc",
    },
  });
}
