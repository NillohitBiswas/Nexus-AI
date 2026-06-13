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
  } catch (error: any) {
    console.error("Report generation failed:", error);
    return { error: error.message || "Failed to generate report" };
  }
}
