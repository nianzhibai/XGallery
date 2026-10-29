import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, accessConfig, accessEnabled, validAccessSession } from "@/lib/gallery-access";

export function proxy(request: NextRequest) {
  if (!accessEnabled()) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  // Media, APIs and framework assets are protected by Cloudflare, not this
  // page gate. The image optimizer's internal fetch does not forward cookies.
  if (pathname === "/verify" || pathname === "/icon.svg" || pathname.startsWith("/api/") || pathname.startsWith("/_next/")) return NextResponse.next();

  const config = accessConfig();
  if (config && validAccessSession(request.cookies.get(ACCESS_COOKIE)?.value, config.sessionSecret)) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  if (request.method !== "GET") return new NextResponse("请先完成访问验证", { status: 401, headers: { "Cache-Control": "no-store" } });
  const url = request.nextUrl.clone();
  url.pathname = "/verify";
  url.search = "";
  url.searchParams.set("next", pathname + search);
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
