import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_API_PREFIXES = [
  "/api/inngest",
  "/api/webhooks",
  "/api/youtube/callback",
];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
}

function isBearerApi(pathname: string): boolean {
  return pathname.startsWith("/api/v1");
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("insforge-token")?.value;
  const { pathname } = request.nextUrl;

  const dashboardRoutes = [
    "/dashboard",
    "/analyzer",
    "/rules",
    "/competitor",
    "/settings",
    "/audience",
    "/leads",
    "/objections",
    "/proof-library",
    "/content-intel",
  ];
  const isDashboardRoute = dashboardRoutes.some((r) => pathname.startsWith(r));
  const isApiRoute = pathname.startsWith("/api") && !pathname.startsWith("/api/auth");
 
  if (isDashboardRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }
 
  if (isApiRoute && !isPublicApi(pathname) && !isBearerApi(pathname) && !token) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in." },
      { status: 401 }
    );
  }
 
  return NextResponse.next();
}
 
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/analyzer/:path*",
    "/rules/:path*",
    "/competitor/:path*",
    "/settings/:path*",
    "/audience/:path*",
    "/leads/:path*",
    "/objections/:path*",
    "/proof-library/:path*",
    "/content-intel/:path*",
    "/api/:path*",
  ],
};

