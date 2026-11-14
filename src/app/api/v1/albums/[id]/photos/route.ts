import { findAlbum, listPhotos } from "@/lib/catalog";
import { photoResource } from "@/lib/api/resources";
import { authorize, badRequest, json, notFound, paginated, pagination } from "@/lib/api/http";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = authorize(request);
  if (denied) return denied;
  const page = pagination(new URL(request.url).searchParams);
  if (!page) return badRequest("page 和 limit 必须为正整数，limit 最大为 100");
  const album = findAlbum((await params).id);
  if (!album) return notFound("图集不存在");
  return json(paginated(listPhotos(album.id, page).map(photoResource), page.page, page.limit, album.photoCount));
}
