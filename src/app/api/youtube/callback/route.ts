import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    console.error("YouTube OAuth error:", error);
    return NextResponse.redirect(new URL("/analyzer?error=" + encodeURIComponent(error), request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/analyzer?error=missing_code", request.url));
  }

  // Get current logged in user
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?redirectTo=/api/youtube/callback", request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error("Missing Google Client ID or Secret");
    return NextResponse.redirect(
      new URL("/analyzer?error=google_credentials_missing", request.url)
    );
  }

  try {
    // 1. Swap authorization code for tokens
    const redirectUri = new URL("/api/youtube/callback", request.url).toString();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.json();
      console.error("Token exchange failed:", tokenError);
      return NextResponse.redirect(
        new URL("/analyzer?error=token_exchange_failed", request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token } = tokenData;

    // 2. Fetch channel metadata using the access token
    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!channelResponse.ok) {
      console.error("Failed to fetch YouTube channel details");
      return NextResponse.redirect(
        new URL("/analyzer?error=channel_details_failed", request.url)
      );
    }

    const channelData = await channelResponse.json();
    const channelItem = channelData.items?.[0];

    if (!channelItem) {
      console.error("No YouTube channel found for the authenticated account");
      return NextResponse.redirect(
        new URL("/analyzer?error=no_channel_found", request.url)
      );
    }

    const channelId = channelItem.id;
    const channelName = channelItem.snippet.title;
    const channelThumbnail = channelItem.snippet.thumbnails?.default?.url || "";
    const subCount = parseInt(channelItem.statistics?.subscriberCount || "0", 10);

    // 3. Encrypt the credentials
    const encryptedAccessToken = encrypt(access_token);
    const encryptedRefreshToken = refresh_token ? encrypt(refresh_token) : null;

    // 4. Save or update the Channel in the database
    // We check if this channel already exists in our DB
    const existingChannel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (existingChannel) {
      // If the channel exists, update its details and refresh token if we got a new one
      await prisma.channel.update({
        where: { id: channelId },
        data: {
          userId: user.id, // Re-bind to current user if needed
          name: channelName,
          thumbnail: channelThumbnail,
          subCount,
          youtubeAccessToken: encryptedAccessToken,
          // Only overwrite refresh token if we got a new one
          ...(encryptedRefreshToken ? { youtubeRefreshToken: encryptedRefreshToken } : {}),
        },
      });
    } else {
      // Create new channel connection
      await prisma.channel.create({
        data: {
          id: channelId,
          userId: user.id,
          name: channelName,
          thumbnail: channelThumbnail,
          subCount,
          youtubeAccessToken: encryptedAccessToken,
          youtubeRefreshToken: encryptedRefreshToken || "",
        },
      });
    }

    return NextResponse.redirect(new URL("/analyzer?success=channel_connected", request.url));
  } catch (err: any) {
    console.error("YouTube callback execution error:", err);
    return NextResponse.redirect(
      new URL("/analyzer?error=" + encodeURIComponent(err.message || "unexpected_error"), request.url)
    );
  }
}
