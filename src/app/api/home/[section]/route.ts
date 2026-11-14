import { badRequest, json } from "@/lib/api/http";
import { homeBatch, isHomeSection, restoreHomeBatch } from "@/lib/home";
import { isCatalogId } from "@/lib/utils";

// `exclude` asks for the next batch; `restore` reconciles a batch saved earlier in the session.
export async function GET(request: Request, { params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!isHomeSection(section)) return badRequest("未知的首页分区");
  const searchParams = new URL(request.url).searchParams;
  if (searchParams.has("exclude") && searchParams.has("restore")) return badRequest("exclude 和 restore 不能同时使用");
  const restore = searchParams.has("restore");
  const ids = searchParams.get(restore ? "restore" : "exclude")?.split(",").filter(Boolean) ?? [];
  if (ids.length > 100 || !ids.every(isCatalogId)) return badRequest("图集 ID 列表无效");
  return json({ data: restore ? restoreHomeBatch(section, ids) : homeBatch(section, ids) });
}
