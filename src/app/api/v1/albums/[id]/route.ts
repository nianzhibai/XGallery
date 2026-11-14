import { findAlbum } from "@/lib/catalog";
import { albumResource } from "@/lib/api/resources";
import { authorize, json, notFound } from "@/lib/api/http";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = authorize(request);
  if (denied) return denied;
  const album = findAlbum((await params).id);
  return album ? json({ data: albumResource(album) }) : notFound("图集不存在");
}
