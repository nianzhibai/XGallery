import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { getPhotoFile } from "@/lib/catalog";
import { resolveMediaPath } from "@/lib/media";

export const runtime = "nodejs";

const imageMimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif",
  ".tif": "image/tiff", ".tiff": "image/tiff",
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = getPhotoFile(id);
  if (!photo) return new Response("图片不存在", { status: 404 });
  try {
    const filename = await resolveMediaPath(photo.relativePath);
    const fileStat = await stat(filename);
    const url = new URL(request.url);
    const version = `${id}-${Math.trunc(fileStat.mtimeMs)}-${fileStat.size}-original`;
    const headers = new Headers({
      "ETag": `"${version}"`,
      "Cache-Control": "public, max-age=3600, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.headers.get("if-none-match") === headers.get("ETag")) return new Response(null, { status: 304, headers });

    headers.set("Content-Type", imageMimeTypes[path.extname(filename).toLowerCase()] || "application/octet-stream");
    headers.set("Content-Length", String(fileStat.size));
    if (url.searchParams.get("download") === "1") headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(photo.filename)}`);
    return new Response(Readable.toWeb(createReadStream(filename)) as ReadableStream<Uint8Array>, { headers });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response("原图已移动，请重新同步图集", { status: 404 });
    console.error("图片读取失败", id, error instanceof Error ? error.message : "unknown");
    return new Response("图片暂时无法加载", { status: 500 });
  }
}
