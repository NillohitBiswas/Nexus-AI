"use server";

import { getCurrentUser } from "@/lib/auth";
import { generateAndUploadReport } from "@/lib/pdf-generator";

export async function generateWhiteLabelReport(scanId: string, agencyName: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  // Only AGENCY tier can generate white-label PDF reports
  if (user.tier !== "AGENCY") {
    return { error: "Report generation is only available for AGENCY tier users." };
  }

  try {
    const result = await generateAndUploadReport(scanId, agencyName || "Nexus Insights Agency");
    return result; // { success: true, url: "..." }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
    console.error("Report generation failed:", msg);
    return { error: msg || "Failed to generate report" };
  }
}
