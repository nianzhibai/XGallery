import { mediaResponse } from "@/lib/media-response";
import { imageCacheControl } from "@/lib/config";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; version: string }> }) {
  const { id, version } = await params;
  return mediaResponse(request, id, { version, cacheControl: imageCacheControl("PREVIEW_CACHE_TTL"), download: false });
}
