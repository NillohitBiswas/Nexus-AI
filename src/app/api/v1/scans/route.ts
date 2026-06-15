import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/v1/scans
export async function GET(request: NextRequest) {
  // 1. Authenticate via Bearer Token
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  
  const user = await prisma.user.findUnique({
    where: { apiToken: token },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid API token" }, { status: 401 });
  }

  if (user.tier !== "AGENCY") {
    return NextResponse.json({ error: "Developer API access is restricted to AGENCY tier" }, { status: 403 });
  }

  // 2. Extract Query Params for Pagination
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const take = Math.min(100, Math.max(1, limit));

  try {
    // 3. Fetch Data
    const scans = await prisma.scan.findMany({
      where: {
        video: {
          channel: {
            userId: user.id,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      skip,
      take,
      include: {
        video: {
          select: {
            videoId: true,
            title: true,
            url: true,
            channel: {
              select: {
                name: true,
              }
            }
          }
        }
      }
    });

    const total = await prisma.scan.count({
      where: {
        video: {
          channel: {
            userId: user.id,
          },
        },
      },
    });

    // 4. Return Paginated Response
    return NextResponse.json({
      data: scans.map(s => ({
        id: s.id,
        videoId: s.video.videoId,
        videoTitle: s.video.title,
        channelName: s.video.channel.name,
        status: s.status,
        progress: s.progress,
        metrics: {
          sentiment: s.weightedSentiment,
          painIndex: s.weightedPainIndex,
          demandVelocity: s.weightedDemandVelocity,
          healthScore: s.executiveSummary ? (s.executiveSummary as any).audienceHealthScore : null
        },
        completedAt: s.completedAt,
      })),
      meta: {
        total,
        page,
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    });

  } catch (err: unknown) {
    console.error("API /v1/scans error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
