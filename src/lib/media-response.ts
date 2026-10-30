import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { getPhotoFile } from "@/lib/catalog";
import { resolveMediaPath } from "@/lib/media";

const imageMimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif",
  ".tif": "image/tiff", ".tiff": "image/tiff",
};

export async function mediaResponse(request: Request, id: string, options: { version: string | null; cacheControl: string; download: boolean }) {
  const photo = getPhotoFile(id);
  if (!photo) return new Response("图片不存在", { status: 404, headers: { "Cache-Control": "no-store" } });
  try {
    const filename = await resolveMediaPath(photo.relativePath);
    const fileStat = await stat(filename);
    const requestedVersion = options.version;
    if (requestedVersion !== `${photo.modifiedAt}-${photo.bytes}` ||
      requestedVersion !== `${Math.trunc(fileStat.mtimeMs)}-${fileStat.size}`) {
      return new Response("图片不存在或已更新", { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    const version = `${id}-${Math.trunc(fileStat.mtimeMs)}-${fileStat.size}-original`;
    const headers = new Headers({
      "ETag": `"${version}"`,
      "Cache-Control": options.cacheControl,
      "X-Content-Type-Options": "nosniff",
    });
    if (request.headers.get("if-none-match") === headers.get("ETag")) return new Response(null, { status: 304, headers });

    headers.set("Content-Type", imageMimeTypes[path.extname(filename).toLowerCase()] || "application/octet-stream");
    headers.set("Content-Length", String(fileStat.size));
    if (options.download) headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(photo.filename)}`);
    return new Response(Readable.toWeb(createReadStream(filename)) as ReadableStream<Uint8Array>, { headers });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response("原图已移动，请重新同步图集", { status: 404, headers: { "Cache-Control": "no-store" } });
    console.error("图片读取失败", id, error instanceof Error ? error.message : "unknown");
    return new Response("图片暂时无法加载", { status: 500 });
  }
}
