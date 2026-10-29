import { NextResponse } from "next/server";
import { ACCESS_COOKIE, ACCESS_MAX_AGE, accessConfig, accessEnabled, createAccessSession, verifyTurnstile } from "@/lib/gallery-access";

export async function POST(request: Request) {
  const config = accessConfig();
  const headers = { "Cache-Control": "no-store" };
  if (!accessEnabled() || !config) return NextResponse.json({ error: "验证服务暂不可用" }, { status: 503, headers });
  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).host !== request.headers.get("host")) return NextResponse.json({ error: "请求来源无效" }, { status: 403, headers });
  } catch { return NextResponse.json({ error: "请求来源无效" }, { status: 403, headers }); }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "请求格式无效" }, { status: 400, headers }); }
  const token = body && typeof body === "object" && "token" in body ? body.token : null;
  if (!await verifyTurnstile(token, config)) return NextResponse.json({ error: "验证未通过，请重试" }, { status: 403, headers });
  const response = NextResponse.json({ ok: true }, { headers });
  response.cookies.set(ACCESS_COOKIE, createAccessSession(config.sessionSecret), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: ACCESS_MAX_AGE,
  });
  return response;
}
