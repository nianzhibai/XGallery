import { realpath } from "node:fs/promises";
import path from "node:path";
import { albumsDirectory } from "./config";

export async function resolveMediaPath(relativePath: string) {
  const root = await realpath(albumsDirectory());
  const filename = await realpath(path.resolve(root, relativePath));
  const relative = path.relative(root, filename);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("图片不在图集目录中");
  }
  return filename;
}

