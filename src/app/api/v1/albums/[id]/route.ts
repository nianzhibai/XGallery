import { findAlbum } from "@/lib/api/catalog";
import { authorize, json, notFound } from "@/lib/api/http";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = authorize(request);
  if (denied) return denied;
  const album = findAlbum((await params).id);
  return album ? json({ data: album }) : notFound("图集不存在");
}
