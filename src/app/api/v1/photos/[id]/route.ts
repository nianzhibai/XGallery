import { authorize } from "@/lib/api/http";
import { mediaResponse } from "@/lib/media-response";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = authorize(request);
  if (denied) return denied;

  const { id } = await params;
  const searchParams = new URL(request.url).searchParams;
  const response = await mediaResponse(request, id, {
    version: searchParams.get("v"),
    cacheControl: "private, no-store",
    download: searchParams.get("download") === "1",
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
