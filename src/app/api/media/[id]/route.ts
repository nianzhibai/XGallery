import { mediaResponse } from "@/lib/media-response";
import { imageCacheControl } from "@/lib/config";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  return mediaResponse(request, id, {
    version: url.searchParams.get("v"),
    cacheControl: imageCacheControl("ORIGINAL_CACHE_TTL"),
    download: url.searchParams.get("download") === "1",
  });
}
