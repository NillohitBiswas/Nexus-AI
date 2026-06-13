import { NextRequest, NextResponse } from "next/server";
import { getYoutubeOAuthUrl } from "@/app/actions/youtube";

export async function GET(request: NextRequest) {
  const result = await getYoutubeOAuthUrl();
  if (result.error || !result.url) {
    return NextResponse.json(
      { error: result.error || "Could not generate YouTube OAuth URL" },
      { status: 500 }
    );
  }
  return NextResponse.redirect(result.url);
}
