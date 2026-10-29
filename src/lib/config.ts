import path from "node:path";

// These are runtime mounts and mutable data, never files to bundle into Next.js.
export const albumsDirectory = () => {
  const directory = process.env.ALBUMS_DIR;
  if (!directory?.trim()) throw new Error("请设置 ALBUMS_DIR 图集目录");
  return path.resolve(/* turbopackIgnore: true */ directory);
};
export const databasePath = () => path.resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH || "./data/xgallery.db");
export const includeAnimatedImages = () => process.env.INCLUDE_ANIMATED_IMAGES !== "false";
