import { findAlbum, listPhotos } from "@/lib/api/catalog";
import { authorize, badRequest, json, notFound, paginated, pagination } from "@/lib/api/http";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = authorize(request);
  if (denied) return denied;
  const page = pagination(new URL(request.url).searchParams);
  if (!page) return badRequest("page 和 limit 必须为正整数，limit 最大为 100");
  const { id } = await params;
  if (!findAlbum(id)) return notFound("图集不存在");
  const result = listPhotos(id, page);
  return json(paginated(result.data, page.page, page.limit, result.total));
}
