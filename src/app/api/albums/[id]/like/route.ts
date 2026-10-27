import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAlbum, setLike } from "@/lib/catalog";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  // Next.js can construct request.url with its internal hostname. The Host
  // header is the public host used by the browser, including the local port.
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) return NextResponse.json({ error: "请求来源无效" }, { status: 403 });
    } catch { return NextResponse.json({ error: "请求来源无效" }, { status: 403 }); }
  }
  const { id } = await params;
  if (!getAlbum(id)) return NextResponse.json({ error: "图集不存在" }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "请求格式无效" }, { status: 400 }); }
  if (!body || typeof body !== "object" || !("liked" in body) || typeof body.liked !== "boolean") {
    return NextResponse.json({ error: "请提供点赞状态" }, { status: 400 });
  }
  const jar = await cookies();
  const stored = jar.get("xgallery-visitor")?.value;
  const visitorId = stored && /^[a-f0-9-]{36}$/.test(stored) ? stored : randomUUID();
  const count = setLike(id, visitorId, body.liked);
  const response = NextResponse.json({ count, liked: body.liked });
  response.cookies.set("xgallery-visitor", visitorId, { httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
