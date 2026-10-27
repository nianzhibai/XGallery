import { getPhotoFile } from "@/lib/catalog";
import { GET as getOriginal } from "@/app/api/media/[id]/route";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; version: string }> }) {
  const { id, version } = await params;
  const photo = getPhotoFile(id);
  if (!photo || version !== `${photo.modifiedAt}-${photo.bytes}`) return new Response("图片不存在或已更新", { status: 404 });
  return getOriginal(request, { params: Promise.resolve({ id }) });
}
