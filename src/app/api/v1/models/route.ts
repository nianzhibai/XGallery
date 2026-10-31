import { listModels } from "@/lib/api/catalog";
import { authorize, badRequest, json, paginated, pagination } from "@/lib/api/http";

export function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  const page = pagination(new URL(request.url).searchParams);
  if (!page) return badRequest("page 和 limit 必须为正整数，limit 最大为 100");
  const result = listModels(page);
  return json(paginated(result.data, page.page, page.limit, result.total));
}
