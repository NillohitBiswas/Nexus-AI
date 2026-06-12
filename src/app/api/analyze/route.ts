import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { inngest } from "@/inngest/client";
import { repairStuckScan } from "@/lib/dashboard/scan-status";
import { trackYoutubeCall } from "@/lib/usage/track";

function extractVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (trimmed.length === 11) return trimmed; // already a video ID
  try {
    const url = new URL(trimmed);
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1);
    }
    if (url.pathname.startsWith("/embed/")) {
      return url.pathname.split("/")[2];
    }
    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.split("/")[2];
    }
    return url.searchParams.get("v");
  } catch (e) {
    return null;
  }
}

// GET /api/analyze?scanId=xyz
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scanId = searchParams.get("scanId");

  if (!scanId) {
    return NextResponse.json({ error: "Missing scanId parameter" }, { status: 400 });
  }

  try {
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: {
        video: {
          include: {
            channel: true,
            comments: {
              orderBy: { publishedAt: "desc" },
            },
          },
        },
      },
    });

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    if (scan.video.channel.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const repaired = (await repairStuckScan(scanId)) ?? scan;
    return NextResponse.json(repaired);
  } catch (err: any) {
    console.error("GET analyze route error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/analyze
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { url, isCompetitor: isCompetitorScan = false } = body;

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL or Video ID" }, { status: 400 });
    }

    const { checkRateLimit } = await import("@/lib/rate-limit");
    const rl = await checkRateLimit(`scan:${user.id}`, 5, 60);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "RATE_LIMITED", message: "Too many scan requests. Try again in a minute." },
        { status: 429 }
      );
    }

    const { canScan } = await import("@/lib/billing/gates");
    const scanGate = await canScan(user.id);
    if (!scanGate.allowed) {
      return NextResponse.json(
        {
          error: scanGate.code,
          message: scanGate.reason,
        },
        { status: 403 }
      );
    }

    // Retrieve channel info from YouTube (or mock if no key configured)
    // To do this, we can try querying standard YouTube API
    let channelId = "ch_default";
    let channelName = "Default Channel";
    let videoTitle = "Default Video Title";
    let channelThumbnail = "";

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey && !apiKey.includes("<PLACEHOLDER")) {
      try {
        // Fetch Video details to get title and channelId
        const videoRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
        );
        if (videoRes.ok) {
          trackYoutubeCall({
            userId: user.id,
            operation: "videos.list",
          });
          const videoJson = await videoRes.json();
          const item = videoJson.items?.[0];
          if (item) {
            videoTitle = item.snippet?.title || videoTitle;
            channelId = item.snippet?.channelId || channelId;
            channelName = item.snippet?.channelTitle || channelName;
          }
        }
      } catch (e) {
        console.error("Failed to fetch video details from YouTube API:", e);
      }
    }

    // Check if channel exists, if not create a default one
    let dbChannel = await prisma.channel.findFirst({
      where: {
        OR: [
          { id: channelId },
          { userId: user.id }, // Connect to user's connected channel if any
        ],
      },
    });

    if (!dbChannel) {
      dbChannel = await prisma.channel.create({
        data: {
          id: channelId,
          userId: user.id,
          name: channelName,
          subCount: 0,
          thumbnail: channelThumbnail,
          isCompetitor: Boolean(isCompetitorScan),
        },
      });
    } else if (isCompetitorScan && !dbChannel.isCompetitor) {
      dbChannel = await prisma.channel.update({
        where: { id: dbChannel.id },
        data: { isCompetitor: true },
      });
    }

    // Create or find Video
    const dbVideo = await prisma.video.upsert({
      where: { videoId },
      update: {
        scanCount: { increment: 1 },
      },
      create: {
        channelId: dbChannel.id,
        videoId,
        title: videoTitle,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        scanCount: 1,
      },
    });

    // Create Scan record
    const scan = await prisma.scan.create({
      data: {
        videoId: dbVideo.id,
        status: "PENDING",
        progress: 0.0,
        isCompetitorScan: Boolean(isCompetitorScan),
      },
    });

    // Dispatch background analysis task via Inngest
    await inngest.send({
      name: "scan/analyze.requested",
      data: {
        videoId: dbVideo.id,
        userId: user.id,
        scanId: scan.id,
      },
    });

    // Count scan attempt toward monthly quota (failed runs still consume a slot)
    await prisma.usageRecord.create({
      data: {
        userId: user.id,
        type: "SCAN",
        quantity: 1,
        amount: 0,
      },
    });

    return NextResponse.json({
      success: true,
      scanId: scan.id,
      videoId: dbVideo.id,
      status: scan.status,
    });
  } catch (err: any) {
    console.error("POST analyze route error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
