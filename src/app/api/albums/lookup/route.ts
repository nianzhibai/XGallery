import { badRequest, json } from "@/lib/api/http";
import { findAlbums } from "@/lib/catalog";
import { isCatalogId } from "@/lib/utils";

// POST keeps long favorite lists out of the URL; the lookup itself is read-only.
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("请求格式无效"); }
  const ids = body && typeof body === "object" && "ids" in body ? body.ids : undefined;
  if (!Array.isArray(ids) || ids.length > 1000 || !ids.every((id) => typeof id === "string" && isCatalogId(id))) {
    return badRequest("ids 必须是最多 1000 个图集 ID");
  }
  return json({ data: findAlbums(ids) });
}
