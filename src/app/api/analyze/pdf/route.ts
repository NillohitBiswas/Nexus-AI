import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderToStream } from "@react-pdf/renderer";
import { ReportDocument } from "@/lib/pdf-generator";
import React from "react";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scanId = searchParams.get("scanId");

  if (!scanId) {
    return new NextResponse("Missing scanId parameter", { status: 400 });
  }

  try {
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: {
        video: {
          include: {
            channel: true,
          },
        },
      },
    });

    if (!scan) {
      return new NextResponse("Scan not found", { status: 404 });
    }

    if (scan.userId !== user.id && scan.video.channel.userId !== user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const themes = await prisma.scanTheme.findMany({
      where: { scanId },
      orderBy: { commentCount: "desc" },
      take: 10,
    });

    // Render PDF to a readable stream
    const stream = await renderToStream(
      React.createElement(ReportDocument, {
        scan,
        themes,
        agencyName: "Nexus Insights",
      }) as any
    );

    // Read stream chunks into a buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Uint8Array);
    }
    const pdfBuffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));

    // Return the PDF buffer directly as a download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nexus_report_${scanId}.pdf"`,
      },
    });
  } catch (err: unknown) {
    console.error("PDF download route error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(message || "Internal server error", { status: 500 });
  }
}
