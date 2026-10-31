import { listAlbums } from "@/lib/api/catalog";
import { authorize, badRequest, json, paginated, pagination } from "@/lib/api/http";

export function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const page = pagination(params);
  if (!page) return badRequest("page 和 limit 必须为正整数，limit 最大为 100");
  const sort = params.get("sort") ?? "updated";
  if (sort !== "updated" && sort !== "title" && sort !== "popular") return badRequest("sort 必须是 updated、title 或 popular");
  const query = params.get("q") ?? "";
  if (query.length > 100) return badRequest("q 不能超过 100 个字符");
  const result = listAlbums(page, { modelId: params.get("modelId") || undefined, query, sort });
  return json(paginated(result.data, page.page, page.limit, result.total));
}
