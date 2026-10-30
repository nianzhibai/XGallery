import path from "node:path";

// These are runtime mounts and mutable data, never files to bundle into Next.js.
export const albumsDirectory = () => {
  const directory = process.env.ALBUMS_DIR;
  if (!directory?.trim()) throw new Error("请设置 ALBUMS_DIR 图集目录");
  return path.resolve(/* turbopackIgnore: true */ directory);
};
export const databasePath = () => path.resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH || "./data/xgallery.db");

export function imageCacheControl(name: "ORIGINAL_CACHE_TTL" | "PREVIEW_CACHE_TTL") {
  const configured = process.env[name];
  const seconds = configured === undefined ? 604800 : Number(configured);
  if ((configured !== undefined && !/^\d+$/.test(configured)) || !Number.isSafeInteger(seconds)) {
    throw new Error(`${name} 必须是非负整数秒数`);
  }
  return `public, max-age=${seconds}, must-revalidate`;
}
