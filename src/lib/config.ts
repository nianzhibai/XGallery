import path from "node:path";

// These are runtime mounts and mutable data, never files to bundle into Next.js.
export const albumsDirectory = () => path.resolve(/* turbopackIgnore: true */ process.env.ALBUMS_DIR || "/root/Albums");
export const databasePath = () => path.resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH || "./data/xgallery.db");
